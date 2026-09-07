import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { getEstimate, listRecentEstimates } from "@/modules/pricing/queries";
import { getBusinessSettings, getMarginThresholds, listRoleCosts } from "@/modules/settings/queries";
import type { RoleCost } from "@/modules/settings/types";
import { rowToActivity, rowToNote } from "@/modules/sourcing/queries/mappers";
import type { ActivityEntry, InternalNote } from "@/modules/sourcing/types";
import { listActiveTalent } from "@/modules/talent/queries";
import type {
  ActivityLogRow, Currency, InternalNoteRow, ProfileRow, ProjectBaselineCostRow, ProjectChangeRequestRow, ProjectDirectCostRow,
  ProjectLinkRow, ProjectMemberRow, ProjectMilestoneRow, ProjectRow, ProjectTaskRow,
} from "@/types/database";

import { computeFinancials } from "./calculations/financials";
import { computeHealth } from "./calculations/health";
import { computeProgress } from "./calculations/progress";
import { ACTIVE_STATUSES, PROJECT_LIST_LIMIT } from "./constants";
import { rowToBaselineCost, rowToChangeRequest, rowToDirectCost, rowToLink, rowToMember, rowToMilestone, rowToProject, rowToTask } from "./mappers";
import { matchesProjectFilters, sortProjects } from "./services/list";
import type {
  ChangeRequest, DirectCost, Milestone, PersonOption, PickerOption, Project, ProjectAssignment, ProjectDetail,
  ProjectFilters, ProjectFinancials, ProjectListItem, ProjectMember, ProjectSort, ProjectStats, Task,
} from "./types";

type ProjectJoined = ProjectRow & { company_leads: { name: string } | null; profiles: { full_name: string | null; email: string } | null };
const PROJECT_SELECT = "*, company_leads(name), profiles:owner_id(full_name, email)";

function toProject(row: ProjectJoined): Project {
  return rowToProject(row, row.company_leads?.name ?? null, row.profiles?.full_name || row.profiles?.email || null);
}

interface Related {
  members: ProjectMember[];
  milestones: Milestone[];
  tasks: Task[];
  costs: DirectCost[];
  changeRequests: ChangeRequest[];
}

/** Loads everything needed to compute financials/health for a set of projects in five queries. */
async function loadRelated(projectIds: string[]): Promise<Record<string, Related>> {
  const out: Record<string, Related> = {};
  for (const id of projectIds) out[id] = { members: [], milestones: [], tasks: [], costs: [], changeRequests: [] };
  if (!projectIds.length) return out;
  const supabase = await createClient();
  const [members, milestones, tasks, costs, crs] = await Promise.all([
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
  for (const r of crs.data ?? []) out[r.project_id]?.changeRequests.push(rowToChangeRequest(r));
  return out;
}

async function computeItem(project: Project, rel: Related, thresholds: Awaited<ReturnType<typeof getMarginThresholds>>): Promise<ProjectListItem> {
  const financials = computeFinancials({ project, members: rel.members, tasks: rel.tasks, costs: rel.costs, changeRequests: rel.changeRequests });
  const progress = computeProgress(rel.tasks, rel.milestones, project.manualProgress);
  const health = computeHealth({ project, milestones: rel.milestones, tasks: rel.tasks, financials, progress, thresholds, today: new Date() });
  return {
    project, financials, progress, health,
    memberCount: rel.members.filter((m) => m.status !== "removed").length,
    openTasks: rel.tasks.filter((t) => t.status !== "done").length,
  };
}

async function fetchAllItems(): Promise<ProjectListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").select(PROJECT_SELECT).order("created_at", { ascending: false }).limit(PROJECT_LIST_LIMIT).returns<ProjectJoined[]>();
  if (error) {
    console.error("[projects] list failed:", error.message);
    return [];
  }
  const projects = (data ?? []).map(toProject);
  const [related, thresholds] = await Promise.all([loadRelated(projects.map((p) => p.id)), getMarginThresholds()]);
  return Promise.all(projects.map((p) => computeItem(p, related[p.id], thresholds)));
}

export async function listProjects(filters: ProjectFilters, sort: ProjectSort): Promise<ProjectListItem[]> {
  const items = await fetchAllItems();
  return sortProjects(items.filter((i) => matchesProjectFilters(i, filters)), sort);
}

export async function getProjectDetail(id: string): Promise<ProjectDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").select(PROJECT_SELECT).eq("id", id).maybeSingle<ProjectJoined>();
  if (error || !data) return null;
  const project = toProject(data);
  const [related, thresholds, links, baseline, notes, activity] = await Promise.all([
    loadRelated([id]),
    getMarginThresholds(),
    supabase.from("project_links").select("*").eq("project_id", id).order("created_at").returns<ProjectLinkRow[]>(),
    supabase.from("project_baseline_costs").select("*").eq("project_id", id).order("position").returns<ProjectBaselineCostRow[]>(),
    supabase.from("internal_notes").select("*").eq("entity_type", "project").eq("entity_id", id).order("created_at", { ascending: false }).returns<InternalNoteRow[]>(),
    supabase.from("activity_log").select("*").eq("entity_type", "project").eq("entity_id", id).order("created_at", { ascending: false }).limit(60).returns<ActivityLogRow[]>(),
  ]);
  const rel = related[id];
  const item = await computeItem(project, rel, thresholds);
  return {
    project, ...rel,
    links: (links.data ?? []).map(rowToLink),
    baselineCosts: (baseline.data ?? []).map(rowToBaselineCost),
    notes: (notes.data ?? []).map(rowToNote) as InternalNote[],
    activity: (activity.data ?? []).map(rowToActivity) as ActivityEntry[],
    financials: item.financials, progress: item.progress, health: item.health,
  };
}

// ---------------------------------------------------------------------------
// Picker data for forms
// ---------------------------------------------------------------------------

export interface ProjectPickers {
  clients: PickerOption[];
  owners: PickerOption[];
  estimates: (PickerOption & { used: boolean })[];
  people: PersonOption[];
  roleCosts: RoleCost[];
  defaults: { currency: Currency; targetMargin: number };
}

export const getProjectPickers = cache(async (): Promise<ProjectPickers> => {
  const supabase = await createClient();
  const [clients, owners, estimates, talent, roleCosts, settings, projects] = await Promise.all([
    supabase.from("company_leads").select("id, name, city, country").order("name").limit(500).returns<{ id: string; name: string; city: string | null; country: string | null }[]>(),
    supabase.from("profiles").select("id, full_name, email").order("full_name").returns<Pick<ProfileRow, "id" | "full_name" | "email">[]>(),
    listRecentEstimates(),
    listActiveTalent(),
    listRoleCosts(),
    getBusinessSettings(),
    supabase.from("projects").select("pricing_estimate_id").not("pricing_estimate_id", "is", null).returns<{ pricing_estimate_id: string }[]>(),
  ]);
  const used = new Set((projects.data ?? []).map((p) => p.pricing_estimate_id));
  return {
    clients: (clients.data ?? []).map((c) => ({ id: c.id, label: c.name, hint: [c.city, c.country].filter(Boolean).join(", ") || undefined })),
    owners: (owners.data ?? []).map((o) => ({ id: o.id, label: o.full_name || o.email, hint: o.full_name ? o.email : undefined })),
    estimates: estimates.map((e) => ({ id: e.id, label: e.projectName, hint: e.clientName ?? undefined, used: used.has(e.id) })),
    people: [
      ...talent.map((t) => ({ id: t.id, kind: "talent" as const, label: t.fullName, hint: t.role ?? undefined, role: t.role, hourlyCost: t.hourlyCost, currency: t.costCurrency, costIsPersonSpecific: t.costIsPersonSpecific })),
      ...(owners.data ?? []).map((o) => ({ id: o.id, kind: "user" as const, label: o.full_name || o.email, hint: o.email, role: null, hourlyCost: null, currency: null, costIsPersonSpecific: false })),
    ],
    roleCosts,
    defaults: { currency: settings.defaultCurrency, targetMargin: settings.targetMargin },
  };
});

/** Estimate → prefill for the New Project form (server-side). */
export async function getEstimatePrefill(estimateId: string) {
  const estimate = await getEstimate(estimateId);
  if (!estimate) return null;
  const items = [...estimate.pricing_cost_items].sort((a, b) => a.position - b.position);
  const revenue = Number(estimate.revenue);
  const directCost = items.reduce((s, i) => s + (i.kind === "fixed" ? Number(i.fixed_amount) : i.kind === "percent" ? (revenue * Number(i.percent ?? 0)) / 100 : Number(i.hours) * Number(i.hourly_rate)), 0);
  return {
    id: estimate.id,
    name: estimate.project_name,
    clientName: estimate.client_name,
    currency: estimate.currency,
    revenue: Number(estimate.revenue),
    directCost,
    targetMargin: Number(estimate.target_margin),
  };
}

/** estimate id → project id (for Pricing's "Create project / Open project" column). */
export async function projectIdsByEstimate(estimateIds: string[]): Promise<Record<string, string>> {
  if (!estimateIds.length) return {};
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("id, pricing_estimate_id").in("pricing_estimate_id", estimateIds).returns<{ id: string; pricing_estimate_id: string }[]>();
  return Object.fromEntries((data ?? []).map((r) => [r.pricing_estimate_id, r.id]));
}

// ---------------------------------------------------------------------------
// Read API for Dashboard / Finance / Capacity (keep stable)
// ---------------------------------------------------------------------------

/** Projects for one client company (read API for Sales). */
export async function listProjectsByClient(clientId: string): Promise<Project[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").select(PROJECT_SELECT).eq("client_id", clientId).order("created_at", { ascending: false }).returns<ProjectJoined[]>();
  if (error) {
    console.error("[projects] listProjectsByClient failed:", error.message);
    return [];
  }
  return (data ?? []).map(toProject);
}

export async function getProjectStats(): Promise<ProjectStats> {
  const items = (await fetchAllItems()).filter((i) => ACTIVE_STATUSES.includes(i.project.status));
  const margins = items.map((i) => i.financials.forecast.grossMargin).filter((m): m is number => m != null);
  return {
    activeProjects: items.length,
    atRiskProjects: items.filter((i) => i.health.status === "at_risk" || i.health.status === "critical").length,
    upcomingDeadlines: items
      .filter((i) => i.project.deadline)
      .sort((a, b) => (a.project.deadline ?? "").localeCompare(b.project.deadline ?? ""))
      .slice(0, 5)
      .map((i) => ({ id: i.project.id, name: i.project.name, deadline: i.project.deadline as string, health: i.health.status })),
    totalRevenue: items.reduce((s, i) => s + i.financials.current.revenue, 0),
    averageMargin: margins.length ? margins.reduce((s, m) => s + m, 0) / margins.length : null,
  };
}

export async function listProjectFinancials(): Promise<{ projectId: string; name: string; status: Project["status"]; financials: ProjectFinancials }[]> {
  return (await fetchAllItems()).map((i) => ({ projectId: i.project.id, name: i.project.name, status: i.project.status, financials: i.financials }));
}

/** One row per project member with planned hours and task hours — what Capacity needs. */
export async function listProjectAssignments(): Promise<ProjectAssignment[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("id, name, status, deadline").in("status", ACTIVE_STATUSES).returns<Pick<ProjectRow, "id" | "name" | "status" | "deadline">[]>();
  const projects = data ?? [];
  const related = await loadRelated(projects.map((p) => p.id));
  const out: ProjectAssignment[] = [];
  for (const p of projects) {
    const rel = related[p.id];
    for (const m of rel.members) {
      if (m.status === "removed") continue;
      const mine = rel.tasks.filter((t) => t.assigneeMemberId === m.id);
      out.push({
        projectId: p.id, projectName: p.name, projectStatus: p.status, projectDeadline: p.deadline,
        memberId: m.id, talentCandidateId: m.talentCandidateId, userId: m.userId, displayName: m.displayName, projectRole: m.projectRole,
        memberStatus: m.status, plannedHours: m.plannedHours, startsOn: m.startsOn, endsOn: m.endsOn,
        taskEstimatedHours: mine.reduce((s, t) => s + (t.estimatedHours ?? 0), 0),
        taskActualHours: mine.reduce((s, t) => s + (t.actualHours ?? 0), 0),
      });
    }
  }
  return out;
}
