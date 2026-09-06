import { NextResponse, type NextRequest } from "next/server";

import { getDictionary } from "@/lib/i18n/server";
import { clipperConnector } from "@/modules/sourcing/connectors/clipper";
import { getCurrentUser } from "@/modules/auth/queries";
import { currentActor } from "@/modules/sourcing/services/actor";
import { ingestTalent } from "@/modules/sourcing/services/ingest";
import { validateTalentInput } from "@/modules/sourcing/services/talent-input";
import { getModule } from "@/config/modules";

/**
 * Endpoint for the GRAFIQ Clipper browser extension.
 *
 * Auth: the extension sends the user's GRAFIQ OS session cookies
 * (credentials: "include"); RLS applies as for any signed-in user.
 * CSRF: only chrome-extension:// origins are allowed by CORS and the request
 * must carry the custom X-GRAFIQ-Clipper header, which forces a preflight.
 */
const CLIPPER_HEADER = "x-grafiq-clipper";

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && /^(chrome|moz|safari-web)-extension:\/\//.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "null",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": `Content-Type, ${CLIPPER_HEADER}`,
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

/** Lets the extension check whether the user is signed in. */
export async function GET(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"));
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ authenticated: false }, { status: 401, headers });
  return NextResponse.json({ authenticated: true, name: user.displayName }, { headers });
}

export async function POST(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"));
  if (!request.headers.get(CLIPPER_HEADER)) return NextResponse.json({ error: "missing clipper header" }, { status: 400, headers });

  const actor = await currentActor();
  if (!actor.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401, headers });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400, headers });
  }

  const dict = await getDictionary();
  const result = validateTalentInput(raw, dict.sourcing.talentInput.validation);
  if (!result.data) return NextResponse.json({ error: result.error, fieldErrors: result.fieldErrors }, { status: 422, headers });

  const platform = typeof (raw as { platform?: unknown }).platform === "string" ? String((raw as { platform: string }).platform).slice(0, 40) : undefined;
  const record = { ...result.data, sourceUrl: result.sourceUrl ?? result.data.sourceUrl };
  const stats = await ingestTalent([record], { sourceId: clipperConnector.id, actor });
  const id = stats.ids[0];
  if (!id) return NextResponse.json({ error: "ingest failed" }, { status: 500, headers });

  return NextResponse.json(
    { id, merged: stats.merged > 0, platform, url: `${getModule("sourcing").href}/talent/${id}` },
    { headers }
  );
}
