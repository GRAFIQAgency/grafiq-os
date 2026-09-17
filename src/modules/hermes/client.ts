import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Service-role Supabase client for the MCP endpoint.
 *
 * Hermes has no user account, so Row Level Security cannot express what it may
 * see — the guardrail is this module instead: every read is one of the
 * enumerated queries below with an explicit column list, a validated input and
 * a capped limit. There is no way to send SQL, a table name or a filter
 * expression from outside.
 */
export function hermesClient(): SupabaseClient {
  const client = createAdminClient();
  if (!client) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured — the Hermes endpoint cannot read data.");
  return client;
}
