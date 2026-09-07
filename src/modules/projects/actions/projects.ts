"use server";

import { getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getEstimate } from "@/modules/pricing/queries";
import { getBusinessSettings } from "@/modules/settings/queries";
import { manualConnector } from "@/modules/sourcing/connectors/manual";
import { currentActor } from "@/modules/sourcing/services/actor";
import { logActivity } from "@/modules/sourcing/services/activity";
import { ingestCompanies } from "@/modules/sourcing/services/ingest";
import type { ProjectRow } from "@/types/database";

import { PROJECT_STATUSES } from "../constants";
import type { ActionResult, ProjectStatus } from "../types";
import { validateProject } from "../validation";
import { fail, revalidateProjects } from "./shared";

export interface CreateProjectResult extends ActionResult {
  id?: string;
}

/**
 * Creates a project manually or from a Pricing estimate. In both cases the
 * financial BASELINE is written once and never touched by later estimate edits.
 * A Pricing estimate can be converted only once (unique pricing_estimate_id).
 */
export async function createProject(raw: unknown): Promise<CreateProjectResult> {
  const dict = await getDictionary();
  const settings = await getBusinessSettings();
  const validated = validateProject(raw, dict.projects.validation, { currency: settings.defaultCurrency, targetMargin: settings.targetMargin });
  if (validated.errors) return validated.errors;
  const input = validated.data;

  const supabase = await createClient();
  const actor = await currentActor();
  let baselineLines: { name: string; kind: "hourly" | "fixed" | "percent"; hours: number; hourly_rate: number; fixed_amount: number; percent: number; total: number; position: number }[] = [];

  if (input.estimateId) {
    const { data: existing } = await supabase.from("projects").select("id").eq("pricing_estimate_id", input.estimateId).maybeSingle<{ id: string }>();
    if (existing) return { error: dict.projects.errors.estimateUsed };
    const estimate = await getEstimate(input.estimateId);
    if (!estimate) return { error: dict.projects.errors.estimateNotFound };
    // Snapshot the cost breakdown as it is right now.
    const revenue = Number(estimate.revenue);
    baselineLines = [...estimate.pricing_cost_items].sort((a, b) => a.position - b.position).map((i, position) => {
      const hours = Number(i.hours), rate = Number(i.hourly_rate), fixed = Number(i.fixed_amount), percent = Number(i.percent ?? 0);
      const total = i.kind === "fixed" ? fixed : i.kind === "percent" ? (revenue * percent) / 100 : hours * rate;
      return { name: i.name, kind: i.kind, hours, hourly_rate: rate, fixed_amount: fixed, percent, total, position };
    });
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      created_by: actor.id, name: input.name, client_id: input.clientId, contact_name: input.contactName, contact_email: input.contactEmail,
      contact_phone: input.contactPhone, project_type: input.projectType, status: input.status, priority: input.priority, owner_id: input.ownerId,
      start_date: input.startDate, deadline: input.deadline, currency: input.currency, baseline_revenue: input.baselineRevenue,
      baseline_direct_cost: input.baselineDirectCost, baseline_target_margin: input.baselineTargetMargin, pricing_estimate_id: input.estimateId,
      notes: input.notes,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return fail(error?.code === "23505" ? dict.projects.errors.estimateUsed : error?.message);

  if (baselineLines.length) {
    await supabase.from("project_baseline_costs").insert(baselineLines.map((l) => ({ ...l, project_id: data.id })));
  }
  // The client becomes a customer in the shared company record (no CRM duplicate).
  if (input.clientId) {
    await supabase.from("company_leads").update({ crm_status: "customer", crm_added_at: new Date().toISOString() }).eq("id", input.clientId).is("crm_status", null);
  }
  await logActivity(supabase, [{ entityType: "project", entityId: data.id, action: "project_created", details: { fromEstimate: Boolean(input.estimateId) } }], actor);
  revalidateProjects();
  return { id: data.id };
}

/** Edits project fields. The financial baseline is intentionally NOT editable here. */
export async function updateProject(id: string, raw: unknown): Promise<ActionResult> {
  const dict = await getDictionary();
  const settings = await getBusinessSettings();
  const validated = validateProject(raw, dict.projects.validation, { currency: settings.defaultCurrency, targetMargin: settings.targetMargin });
  if (validated.errors) return validated.errors;
  const input = validated.data;
  const supabase = await createClient();
  const actor = await currentActor();
  const { data: before } = await supabase.from("projects").select("deadline, status").eq("id", id).maybeSingle<Pick<ProjectRow, "deadline" | "status">>();
  const { error } = await supabase.from("projects").update({
    name: input.name, client_id: input.clientId, contact_name: input.contactName, contact_email: input.contactEmail, contact_phone: input.contactPhone,
    project_type: input.projectType, priority: input.priority, owner_id: input.ownerId, start_date: input.startDate, deadline: input.deadline, notes: input.notes,
  }).eq("id", id);
  if (error) return fail(error.message);
  if (before && before.deadline !== input.deadline) {
    await logActivity(supabase, [{ entityType: "project", entityId: id, action: "deadline_changed", details: { from: before.deadline, to: input.deadline } }], actor);
  }
  revalidateProjects();
  return {};
}

export async function setProjectStatus(id: string, status: ProjectStatus): Promise<ActionResult> {
  if (!PROJECT_STATUSES.includes(status)) return {};
  const supabase = await createClient();
  const actor = await currentActor();
  const { error } = await supabase.from("projects").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", id);
  if (error) return fail(error.message);
  await logActivity(supabase, [{ entityType: "project", entityId: id, action: "status_changed", details: { status } }], actor);
  revalidateProjects();
  return {};
}

export async function setManualProgress(id: string, percent: number | null): Promise<ActionResult> {
  const value = percent == null || percent === ("" as unknown) ? null : Math.max(0, Math.min(100, Math.round(Number(percent))));
  const supabase = await createClient();
  const { error } = await supabase.from("projects").update({ manual_progress: Number.isFinite(value as number) ? value : null }).eq("id", id);
  if (error) return fail(error.message);
  revalidateProjects();
  return {};
}

export interface AddClientResult extends ActionResult {
  id?: string;
  name?: string;
}

/** "Add company" inside the project form → shared company pipeline (normalise + dedupe). */
export async function addClientCompany(raw: { name?: string; website?: string; country?: string }): Promise<AddClientResult> {
  const dict = await getDictionary();
  const name = typeof raw?.name === "string" ? raw.name.trim().slice(0, 200) : "";
  if (!name) return { error: dict.projects.errors.companyNameRequired };
  const website = typeof raw?.website === "string" && raw.website.trim() ? raw.website.trim() : undefined;
  const country = typeof raw?.country === "string" && raw.country.trim() ? raw.country.trim() : undefined;
  const actor = await currentActor();
  const stats = await ingestCompanies(
    [{ sourceEntityId: website ? `site:${website.toLowerCase()}` : `manual:${name.toLowerCase()}:${Date.now()}`, sourceUrl: website, name, website, country }],
    { sourceId: manualConnector.id, actor }
  );
  const id = stats.ids[0];
  if (!id) return fail("company ingest failed");
  const supabase = await createClient();
  const { data } = await supabase.from("company_leads").select("name").eq("id", id).maybeSingle<{ name: string }>();
  revalidateProjects();
  return { id, name: data?.name ?? name };
}
