import { createMcpHandler } from "mcp-handler";

import { bearerFromHeader, isTokenConfigured, tokenFingerprint, verifyToken } from "@/modules/hermes/auth";
import { RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS } from "@/modules/hermes/constants";
import { checkRateLimit } from "@/modules/hermes/rate-limit";
import { registerHermesTools } from "@/modules/hermes/tools";

/**
 * MCP endpoint for Hermes, the operator agent.
 *
 * Auth is a single static bearer token (`HERMES_API_TOKEN`), compared in
 * constant time. There is no OAuth flow and no user session: Hermes is one
 * machine client, so `withMcpAuth`'s RFC 9728 challenge would point at an
 * authorization server that does not exist. A plain 401 is the honest answer.
 *
 * Node runtime: the handler needs `node:crypto` and the service-role key.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mcp = createMcpHandler(
  (server) => {
    registerHermesTools(server);
  },
  { serverInfo: { name: "grafiq-os", version: "1.0.0" } }
);

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: {
      "content-type": "application/json",
      "www-authenticate": 'Bearer realm="grafiq-os", error="invalid_token"',
      "cache-control": "no-store",
    },
  });
}

function tooManyRequests(resetAt: number): Response {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return new Response(JSON.stringify({ error: "rate limit exceeded", retryAfterSeconds: retryAfter }), {
    status: 429,
    headers: {
      "content-type": "application/json",
      "retry-after": String(retryAfter),
      "x-ratelimit-limit": String(RATE_LIMIT_REQUESTS),
      "x-ratelimit-window-seconds": String(RATE_LIMIT_WINDOW_MS / 1000),
      "cache-control": "no-store",
    },
  });
}

async function handle(request: Request): Promise<Response> {
  if (!isTokenConfigured()) {
    console.error("[hermes] HERMES_API_TOKEN is not set (or too short) — every MCP request is refused.");
    return unauthorized();
  }

  const token = bearerFromHeader(request.headers.get("authorization"));
  if (!verifyToken(token)) return unauthorized();

  const rate = checkRateLimit(tokenFingerprint(token as string));
  if (!rate.ok) return tooManyRequests(rate.resetAt);

  return mcp(request);
}

export { handle as GET, handle as POST, handle as DELETE };
