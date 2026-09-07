import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { CompanyStatus } from "../types";
import type { Actor } from "./actor";
import { logActivity } from "./activity";

/**
 * Save to CRM — the ONE code path that puts a shared company record into the
 * Sales pipeline. Used by Sourcing (review flow) and Sales (add company).
 * Never creates a new company; it only sets the lifecycle fields. Companies
 * already in CRM are left untouched, so there are never duplicates.
 */
export async function markInCrm(supabase: SupabaseClient, ids: string[], actor: Actor): Promise<{ error?: string; added: string[] }> {
  if (!ids.length) return { added: [] };
  const { data, error } = await supabase
    .from("company_leads")
    .update({ crm_status: "prospect", crm_added_at: new Date().toISOString() })
    .in("id", ids)
    .is("crm_status", null)
    .select("id, status")
    .returns<{ id: string; status: CompanyStatus }[]>();
  if (error) return { error: error.message, added: [] };

  const added = (data ?? []).map((r) => r.id);
  // Promote still-unreviewed companies to shortlisted so the sourcing pipeline stays truthful.
  const toPromote = (data ?? []).filter((r) => ["discovered", "reviewed"].includes(r.status)).map((r) => r.id);
  if (toPromote.length) await supabase.from("company_leads").update({ status: "shortlisted" }).in("id", toPromote);

  await logActivity(supabase, added.map((id) => ({ entityType: "company" as const, entityId: id, action: "saved_to_crm" as const })), actor);
  return { added };
}
