import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_BUSINESS_SETTINGS } from "@/modules/settings/constants";
import { toBusinessSettings } from "@/modules/settings/queries";
import { marginThresholds } from "@/modules/settings/services";
import type { BusinessSettings, MarginThresholds } from "@/modules/settings/types";
import {
  rowToChangeRequest, rowToDirectCost, rowToMember, rowToMilestone, rowToProject, rowToTask,
} from "@/modules/projects/mappers";
import type { ChangeRequest, DirectCost, Milestone, Project, ProjectMember, Task } from "@/modules/projects/types";
import type {
  BusinessSettingsRow, ProjectChangeRequestRow, ProjectDirectCostRow, ProjectMemberRow, ProjectMilestoneRow, ProjectRow, ProjectTaskRow,
} from "@/types/database";

import { hermesClient } from "../client";
import { MAX_LIMIT } from "../constants";

/**
 * Loaders shared by the read tools.
 *
 * They fetch rows with the service-role client and then hand them to the SAME
 * pure functions the UI uses (`computeFinancials`, `computeHealth`,
 * `pipelineStats`, …). Only the fetching differs from the app — never the
 * maths — so a number Hermes reports matches what Alex sees on screen.
 */

export type ProjectJoined = ProjectRow & { company_leads: { name: string } | null };
export const PROJECT_COLUMNS =
  "id, created_at, updated_at, name, client_id, project_type, status, priority, owner_id, start_date, deadline, currency, " +
  "baseline_revenue, baseline_direct_cost, baseline_target_margin, baseline_created_at, baseline_unit_count, baseline_unit_price, " +
  "unit_label, pricing_estimate_id, manual_progress, completed_at, company_leads(name)";

export const today = () => new Date().toISOString().slice(0, 10);
export const clampLimit = (limit: number | undefined) => Math.min(Math.max(1, limit ?? 25), MAX_LIMIT);

export interface Related {
  members: ProjectMember[];
  milestones: Milestone[];
  tasks: Task[];
  costs: DirectCost[];
  changeRequests: ChangeRequest[];
}

const emptyRelated = (): Related => ({ members: [], milestones: [], tasks: [], costs: [], changeRequests: [] });

/** Everything `computeFinancials` / `computeHealth` need, for a set of projects. */
export async function loadRelated(supabase: SupabaseClient, projectIds: string[]): Promise<Record<string, Related>> {
  const out: Record<string, Related> = {};
  for (const id of projectIds) out[id] = emptyRelated();
  if (!projectIds.length) return out;
  const [members, milestones, tasks, costs, changes] = await Promise.all([
    supabase.from("project_members").select("*").in("project_id", projectIds).returns<ProjectMemberRow[]>(),
    supabase.from("project_milestones").select("*").in("project_id", projectIds).order("position").returns<ProjectMilestoneRow[]>(),
    supabase.from("project_tasks").select("*").in("project_id", projectIds).order("position").returns<ProjectTaskRow[]>(),
    supabase.from("project_direct_costs").select("*").in("project_id", projectIds).returns<ProjectDirectCostRow[]>(),
    supabase.from("project_change_requests").select("*").in("project_id", projectIds).order("created_at").returns<ProjectChangeRequestRow[]>(),
  ]);
  for (const r of members.data ?? []) out[r.project_id]?.members.push(rowToMember(r));
  for (const r of milestones.data ?? []) out[r.project_id]?.milestones.push(rowToMilestone(r));
  for (const r of tasks.data ?? []) out[r.project_id]?.tasks.push(rowToTask(r));
  for (const r of costs.data ?? []) out[r.project_id]?.costs.push(rowToDirectCost(r));
  for (const r of changes.data ?? []) out[r.project_id]?.changeRequests.push(rowToChangeRequest(r));
  return out;
}

export function toProject(row: ProjectJoined): Project {
  // Owner is an auth user; the endpoint never exposes people's contact details,
  // so the owner name is deliberately left out of every payload.
  return rowToProject(row as ProjectRow, row.company_leads?.name ?? null, null);
}

/** Business Settings read with the service-role client (no user session here). */
export async function loadSettings(): Promise<{ settings: BusinessSettings; thresholds: MarginThresholds }> {
  const supabase = hermesClient();
  const { data } = await supabase.from("business_settings").select("*").eq("id", 1).maybeSingle<BusinessSettingsRow>();
  const settings = data ? toBusinessSettings(data) : DEFAULT_BUSINESS_SETTINGS;
  return { settings, thresholds: marginThresholds(settings) };
}

/** Money always travels with its currency; the endpoint never adds currencies together. */
export interface Money {
  amount: number;
  currency: string;
}
export const money = (amount: number, currency: string): Money => ({ amount: Math.round(amount * 100) / 100, currency });

/** Sums per currency, returned as separate entries. */
export function sumByCurrency(items: { amount: number; currency: string }[]): Money[] {
  const totals = new Map<string, number>();
  for (const i of items) totals.set(i.currency, (totals.get(i.currency) ?? 0) + i.amount);
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([currency, amount]) => money(amount, currency));
}
