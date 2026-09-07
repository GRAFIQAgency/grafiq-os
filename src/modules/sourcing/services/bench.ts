import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { TalentStatus } from "../types";
import type { Actor } from "./actor";
import { logActivity } from "./activity";

/**
 * Save to Talent Bench — the ONE code path that moves a shared person record
 * onto the bench. Used by Sourcing (review flow) and Talent (add person).
 * Never creates a new person; it only flips lifecycle fields.
 */
export async function markInTalentBench(supabase: SupabaseClient, ids: string[], actor: Actor): Promise<{ error?: string; added: string[] }> {
  if (!ids.length) return { added: [] };
  const { data, error } = await supabase
    .from("talent_candidates")
    .update({ in_talent_bench: true, bench_added_at: new Date().toISOString() })
    .in("id", ids)
    .eq("in_talent_bench", false)
    .select("id, status")
    .returns<{ id: string; status: TalentStatus }[]>();
  if (error) return { error: error.message, added: [] };

  const added = (data ?? []).map((r) => r.id);
  // Promote still-unreviewed candidates to shortlisted so the pipeline stays truthful.
  const toPromote = (data ?? []).filter((r) => ["discovered", "reviewed"].includes(r.status)).map((r) => r.id);
  if (toPromote.length) await supabase.from("talent_candidates").update({ status: "shortlisted" }).in("id", toPromote);

  // Restoring an archived bench member: reset the operational status, keep everything else.
  if (added.length) {
    await supabase.from("talent_bench_details").update({ bench_status: "active" }).in("talent_candidate_id", added).eq("bench_status", "archived");
  }

  await logActivity(supabase, added.map((id) => ({ entityType: "talent" as const, entityId: id, action: "saved_to_bench" as const })), actor);
  return { added };
}
