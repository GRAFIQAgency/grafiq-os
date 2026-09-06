import { createClient } from "@/lib/supabase/server";
import type { SourcingSourceRow } from "@/types/database";

import { connectors } from "../connectors/registry";
import type { SourceState } from "../types";

/** Registry connectors merged with their persisted enabled/health state. */
export async function listSources(): Promise<SourceState[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sourcing_sources").select("*").returns<SourcingSourceRow[]>();
  if (error) console.error("[sourcing] listSources failed:", error.message);
  const rows = new Map((data ?? []).map((r) => [r.id, r]));

  return connectors.map((c) => {
    const row = rows.get(c.id);
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      supportedEntityTypes: c.supportedEntityTypes,
      rateLimit: c.rateLimit ?? null,
      // Unknown to the DB (migration not applied) → treated as disabled.
      enabled: row?.enabled ?? false,
      lastRunAt: row?.last_run_at ?? null,
      lastError: row?.last_error ?? null,
      recordsCollected: row?.records_collected ?? 0,
    };
  });
}

export async function enabledSourceIds(): Promise<Set<string>> {
  const sources = await listSources();
  return new Set(sources.filter((s) => s.enabled).map((s) => s.id));
}
