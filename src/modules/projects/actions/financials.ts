"use server";

import { getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { currentActor } from "@/modules/sourcing/services/actor";
import { logActivity } from "@/modules/sourcing/services/activity";
import type { Currency } from "@/types/database";

import { CHANGE_REQUEST_STATUSES } from "../constants";
import type { ActionResult, ChangeRequestStatus } from "../types";
import { validateChangeRequest, validateDirectCost, validateLink } from "../validation";
import { fail, revalidateProjects } from "./shared";

export async function saveLink(projectId: string, raw: unknown): Promise<ActionResult> {
  const dict = await getDictionary();
  const v = validateLink(raw, dict.projects.validation);
  if (v.errors) return v.errors;
  const supabase = await createClient();
  const { error } = await supabase.from("project_links").insert({ project_id: projectId, label: v.data.label, url: v.data.url, kind: v.data.kind });
  if (error) return fail(error.message);
  revalidateProjects();
  return {};
}

export async function deleteLink(linkId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("project_links").delete().eq("id", linkId);
  if (error) return fail(error.message);
  revalidateProjects();
  return {};
}

export async function saveDirectCost(projectId: string, currency: Currency, raw: unknown, costId?: string): Promise<ActionResult> {
  const dict = await getDictionary();
  const v = validateDirectCost(raw, dict.projects.validation, currency);
  if (v.errors) return v.errors;
  const c = v.data;
  const supabase = await createClient();
  const row = { label: c.label, category: c.category, estimated_cost: c.estimatedCost, actual_cost: c.actualCost, currency: c.currency, note: c.note };
  const { error } = costId
    ? await supabase.from("project_direct_costs").update(row).eq("id", costId)
    : await supabase.from("project_direct_costs").insert({ ...row, project_id: projectId });
  if (error) return fail(error.message);
  revalidateProjects();
  return {};
}

export async function deleteDirectCost(costId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("project_direct_costs").delete().eq("id", costId);
  if (error) return fail(error.message);
  revalidateProjects();
  return {};
}

export async function saveChangeRequest(projectId: string, raw: unknown, changeId?: string): Promise<ActionResult> {
  const dict = await getDictionary();
  const v = validateChangeRequest(raw, dict.projects.validation);
  if (v.errors) return v.errors;
  const c = v.data;
  const supabase = await createClient();
  const row = { title: c.title, description: c.description, additional_revenue: c.additionalRevenue, additional_direct_cost: c.additionalDirectCost, deadline_impact_days: c.deadlineImpactDays, notes: c.notes };
  const { error } = changeId
    ? await supabase.from("project_change_requests").update(row).eq("id", changeId)
    : await supabase.from("project_change_requests").insert({ ...row, project_id: projectId, status: c.status });
  if (error) return fail(error.message);
  revalidateProjects();
  return {};
}

/** Status transitions. Approving logs an activity entry; economics are derived, never written to the baseline. */
export async function setChangeRequestStatus(projectId: string, changeId: string, status: ChangeRequestStatus): Promise<ActionResult> {
  if (!CHANGE_REQUEST_STATUSES.includes(status)) return {};
  const supabase = await createClient();
  const actor = await currentActor();
  const { data, error } = await supabase.from("project_change_requests")
    .update({ status, approved_at: status === "approved" ? new Date().toISOString() : null })
    .eq("id", changeId).select("title, additional_revenue, additional_direct_cost").single<{ title: string; additional_revenue: number; additional_direct_cost: number }>();
  if (error) return fail(error.message);
  if (status === "approved") {
    await logActivity(supabase, [{ entityType: "project", entityId: projectId, action: "change_request_approved", details: { title: data?.title, revenue: Number(data?.additional_revenue), cost: Number(data?.additional_direct_cost) } }], actor);
  }
  revalidateProjects();
  return {};
}
