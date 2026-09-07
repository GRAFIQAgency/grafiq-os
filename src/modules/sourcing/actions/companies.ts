"use server";

import { revalidatePath } from "next/cache";

import { getModule } from "@/config/modules";
import { createClient } from "@/lib/supabase/server";
import type { CompanyLeadRow } from "@/types/database";

import { COMPANY_STATUSES } from "../constants";
import { listCompanySignals } from "../queries/companies";
import { rowToCompany } from "../queries/mappers";
import { scoreCompany } from "../scoring";
import { currentActor } from "../services/actor";
import { logActivity } from "../services/activity";
import { markInCrm } from "../services/crm";
import type { ActionResult, CompanyStatus } from "../types";
import { cleanIds, cleanScore, cleanTags, failure, revalidateSourcing } from "./shared";

export async function updateCompanyStatus(ids: string[], status: CompanyStatus): Promise<ActionResult> {
  const list = cleanIds(ids);
  if (!list.length || !COMPANY_STATUSES.includes(status)) return {};
  const supabase = await createClient();
  const actor = await currentActor();
  const { error } = await supabase.from("company_leads").update({ status }).in("id", list);
  if (error) return failure(error);
  await logActivity(supabase, list.map((id) => ({ entityType: "company" as const, entityId: id, action: status === "reviewed" ? "reviewed" as const : "status_changed" as const, details: { status } })), actor);
  revalidateSourcing();
  return {};
}

/**
 * Save to CRM = put the shared company record into the Sales pipeline (stage
 * "prospect"). The lead IS the CRM record, so nothing is copied and companies
 * already in CRM are left untouched. Shared code path: services/crm.ts.
 */
export async function saveCompaniesToCrm(ids: string[]): Promise<ActionResult> {
  const list = cleanIds(ids);
  if (!list.length) return {};
  const supabase = await createClient();
  const actor = await currentActor();
  const result = await markInCrm(supabase, list, actor);
  if (result.error) return failure({ message: result.error });
  revalidateSourcing();
  revalidatePath(getModule("sales").href, "layout");
  return {};
}

export async function addCompanyTag(ids: string[], tag: string): Promise<ActionResult> {
  const list = cleanIds(ids);
  const [clean] = cleanTags([tag]);
  if (!list.length || !clean) return {};
  const supabase = await createClient();
  const actor = await currentActor();
  const { data, error } = await supabase.from("company_leads").select("id, tags").in("id", list).returns<{ id: string; tags: string[] }[]>();
  if (error) return failure(error);
  for (const row of data ?? []) {
    if (row.tags.includes(clean)) continue;
    await supabase.from("company_leads").update({ tags: [...row.tags, clean] }).eq("id", row.id);
  }
  await logActivity(supabase, list.map((id) => ({ entityType: "company" as const, entityId: id, action: "tags_changed" as const, details: { added: clean } })), actor);
  revalidateSourcing();
  return {};
}

export async function setCompanyTags(id: string, tags: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const actor = await currentActor();
  const clean = cleanTags(tags);
  const { error } = await supabase.from("company_leads").update({ tags: clean }).eq("id", id);
  if (error) return failure(error);
  await logActivity(supabase, [{ entityType: "company", entityId: id, action: "tags_changed", details: { tags: clean } }], actor);
  revalidateSourcing();
  return {};
}

export async function setCompanyManualScore(id: string, score: number | null): Promise<ActionResult> {
  const supabase = await createClient();
  const actor = await currentActor();
  const clean = cleanScore(score);
  const { error } = await supabase.from("company_leads").update({ manual_score: clean }).eq("id", id);
  if (error) return failure(error);
  await logActivity(supabase, [{ entityType: "company", entityId: id, action: "score_overridden", details: { score: clean } }], actor);
  revalidateSourcing();
  return {};
}

/** `_roleProfileId` is unused for companies; the parameter keeps the signature shared with talent (see ScorePanel). */
export async function rescoreCompany(id: string, _roleProfileId: string | null, useAi: boolean): Promise<ActionResult> {
  void _roleProfileId;
  const supabase = await createClient();
  const actor = await currentActor();
  const { data } = await supabase.from("company_leads").select("*").eq("id", id).maybeSingle<CompanyLeadRow>();
  if (!data) return {};
  const result = await scoreCompany(rowToCompany(data), await listCompanySignals(id), Boolean(useAi));
  const { error } = await supabase.from("ai_evaluations").insert({
    entity_type: "company", entity_id: id, role_profile_id: null, provider: result.provider, model: result.model ?? null,
    score: result.score, strengths: result.strengths, weaknesses: result.weaknesses, missing_info: result.missingInfo,
    risks: result.risks, reasoning: result.reasoning, factors: result.factors,
  });
  if (error) return failure(error);
  await supabase.from("company_leads").update({ lead_score: result.score }).eq("id", id);
  await logActivity(supabase, [{ entityType: "company", entityId: id, action: "scored", details: { score: result.score, provider: result.provider } }], actor);
  revalidateSourcing();
  return {};
}
