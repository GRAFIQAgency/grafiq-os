import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "@/config/env";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Reads/writes the auth session from Next.js cookies.
 */
export async function createClient() {
  // Read cookies first: this marks the route as dynamic so Next.js never tries
  // to prerender authenticated pages at build time (where env may be absent).
  const cookieStore = await cookies();
  const { url, key } = getSupabaseEnv();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy (src/proxy.ts) refreshes sessions, so this is safe to ignore.
        }
      },
    },
  });
}
