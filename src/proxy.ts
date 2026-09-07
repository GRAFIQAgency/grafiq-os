import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js proxy (formerly "middleware"). Runs before every matched request.
 * Auth logic lives in `src/lib/supabase/proxy.ts` to keep this file thin.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Run on everything except Next internals and static assets.
    // PWA files (manifest, service worker, icons) must stay reachable without a session.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
