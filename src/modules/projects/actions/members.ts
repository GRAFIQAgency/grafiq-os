"use server";

import { getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { currentActor } from "@/modules/sourcing/services/actor";
import { logActivity } from "@/modules/sourcing/services/activity";
import type { ProfileRow, TalentCandidateRow } from "@/types/database";

import type { ActionResult } from "../types";
import { validateMember } from "../validation";
import { fail, revalidateProjects } from "./shared";

/**
 * Adds a person from the Talent Bench or an internal user. The cost rate in
 * the form (suggested from Talent → Settings role default → manual) is stored
 * as a SNAPSHOT on the member row.
 */
export async function addMember(projectId: string, raw: unknown): Promise<ActionResult> {
  const dict = await getDictionary();
  const validated = validateMember(raw, dict.projects.validation);
  if (validated.errors) return validated.errors;
  const m = validated.data;
  const supabase = await createClient();
  const actor = await currentActor();

  let displayName = "";
  if (m.talentCandidateId) {
    const { data } = await supabase.from("talent_candidates").select("full_name, in_talent_bench").eq("id", m.talentCandidateId).maybeSingle<Pick<TalentCandidateRow, "full_name" | "in_talent_bench">>();
    if (!data) return { error: dict.projects.validation.personRequired };
    displayName = data.full_name;
  } else if (m.userId) {
    const { data } = await supabase.from("profiles").select("full_name, email").eq("id", m.userId).maybeSingle<Pick<ProfileRow, "full_name" | "email">>();
    if (!data) return { error: dict.projects.validation.personRequired };
    displayName = data.full_name || data.email;
  }

  const { error } = await supabase.from("project_members").insert({
    project_id: projectId, talent_candidate_id: m.talentCandidateId, user_id: m.userId, display_name: displayName, project_role: m.projectRole,
    status: m.status, planned_hours: m.plannedHours, starts_on: m.startsOn, ends_on: m.endsOn, cost_rate: m.costRate, currency: m.currency,
    rate_source: m.rateSource, notes: m.notes, pay_model: m.payModel, fixed_cost: m.fixedCost, percent: m.percent,
  });
  if (error) return error.code === "23505" ? { error: dict.projects.errors.duplicateMember } : fail(error.message);
  await logActivity(supabase, [{ entityType: "project", entityId: projectId, action: "member_added", details: { name: displayName, role: m.projectRole, payModel: m.payModel, rate: m.costRate, fixedCost: m.fixedCost, percent: m.percent, source: m.rateSource } }], actor);
  revalidateProjects();
  return {};
}

export async function updateMember(memberId: string, raw: unknown): Promise<ActionResult> {
  const dict = await getDictionary();
  const validated = validateMember({ ...(typeof raw === "object" && raw ? raw : {}), person: "keep:x" }, dict.projects.validation);
  // `person` is not editable; validateMember needs a value only to pass the identity check.
  if (validated.errors && validated.errors.fieldErrors && Object.keys(validated.errors.fieldErrors).some((k) => k !== "person")) return validated.errors;
  const r = (typeof raw === "object" && raw ? raw : {}) as Record<string, unknown>;
  const supabase = await createClient();
  const num = (v: unknown) => (v === "" || v == null ? null : Number(v));
  const { error } = await supabase.from("project_members").update({
    project_role: String(r.projectRole ?? "").trim().slice(0, 100) || undefined,
    status: ["planned", "active", "completed", "removed"].includes(String(r.status)) ? String(r.status) : undefined,
    planned_hours: num(r.plannedHours), starts_on: (r.startsOn as string) || null, ends_on: (r.endsOn as string) || null,
    cost_rate: num(r.costRate), currency: ["CZK", "EUR", "USD"].includes(String(r.currency)) ? String(r.currency) : null,
    rate_source: r.costRate !== undefined ? "manual" : undefined, notes: String(r.notes ?? "").trim().slice(0, 2000) || null,
    pay_model: ["hourly", "fixed", "percent"].includes(String(r.payModel)) ? String(r.payModel) : undefined,
    fixed_cost: r.payModel === undefined ? undefined : r.payModel === "fixed" ? num(r.fixedCost) : null,
    percent: r.payModel === undefined ? undefined : r.payModel === "percent" ? num(r.percent) : null,
  }).eq("id", memberId);
  if (error) return fail(error.message);
  revalidateProjects();
  return {};
}

/** Soft removal: the member row (and its rate snapshot) stays so logged hours remain priced. */
export async function removeMember(projectId: string, memberId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const actor = await currentActor();
  const { data } = await supabase.from("project_members").select("display_name").eq("id", memberId).maybeSingle<{ display_name: string }>();
  const { error } = await supabase.from("project_members").update({ status: "removed" }).eq("id", memberId);
  if (error) return fail(error.message);
  await logActivity(supabase, [{ entityType: "project", entityId: projectId, action: "member_removed", details: { name: data?.display_name } }], actor);
  revalidateProjects();
  return {};
}
