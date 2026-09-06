import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "@/config/env";

/** Supabase client for Client Components (runs in the browser). */
export function createClient() {
  const { url, key } = getSupabaseEnv();
  return createBrowserClient(url, key);
}
