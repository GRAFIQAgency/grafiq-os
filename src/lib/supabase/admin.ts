import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/config/env";

/**
 * Service-role client that bypasses Row Level Security.
 * SERVER ONLY. Use it exclusively for trusted, validated writes that happen
 * without a signed-in user (e.g. the public application form). Never import
 * it from anything a browser could bundle.
 */
export function createAdminClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  const { url } = getSupabaseEnv();
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
