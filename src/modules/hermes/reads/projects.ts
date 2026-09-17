import "server-only";

import { computeFinancials } from "@/modules/projects/calculations/financials";
import { computeHealth } from "@/modules/projects/calculations/health";
import { computeProgress } from "@/modules/projects/calculations/progress";
import { ACTIVE_STATUSES, PROJECT_LIST_LIMIT } from "@/modules/projects/constants";
import { completionGate } from "@/modules/qa/calculations/gate";
import type { QaChecklistRow } from "@/types/database";

import { hermesClient } from "../client";
import { MAX_LIMIT } from "../constants";
import { clampLimit, loadRelated, loadSettings, money, PROJECT_COLUMNS, toProject, today, type ProjectJoined } from "./shared";

/**
 * Project reads. Health, margin and progress come from the Projects module's
 * own pure calculations — this file only fetches rows and shapes the answer.
 */

export interface ProjectsOverviewInput {
  status?: string;
  clientId?: string;
  limit?: number;
  offset?: number;
}

export async function projectsOverview(input: ProjectsOverviewInput) {
  const supabase = hermesClient();
  const limit = clampLimit(input.limit);
  const offset = Math.max(0, input.offset ?? 0);

  let query = supabase.from("projects").select(PROJECT_COLUMNS, { count: "exact" }).order("created_at", { ascending: false });
  if (input.status) query = query.eq("status", input.status);
  if (input.clientId) query = query.eq("client_id", input.clientId);

  const { data, error, count } = await query.range(offset, offset + limit - 1).returns<ProjectJoined[]>();
  if (error) throw new Error(`projects read failed: ${error.message}`);
  const rows = data ?? [];
  const projects = rows.map(toProject);
  const [related, { thresholds }] = await Promise.all([loadRelated(supabase, projects.map((p) => p.id)), loadSettings()]);
  const now = new Date();

  const items = projects.map((project) => {
    const rel = related[project.id];
    const financials = computeFinancials({ project, members: rel.members, tasks: rel.tasks, costs: rel.costs, changeRequests: rel.changeRequests });
    const progress = computeProgress(rel.tasks, rel.milestones, project.manualProgress);
    const health = computeHealth({ project, milestones: rel.milestones, tasks: rel.tasks, financials, progress, thresholds, today: now });
    return {
      id: project.id,
      name: project.name,
      client: project.clientName,
      status: project.status,
      projectType: project.projectType,
      currency: project.currency,
      deadline: project.deadline,
      progressPercent: progress.percent,
      health: health.status,
      healthReasons: health.reasons.map((r) => ({ code: r.code, params: r.params })),
      // Economics, excluding VAT — this is profit, not cash. Cash lives in finance_overview.
      sold: { revenue: money(financials.baseline.revenue, project.currency), grossMargin: financials.baseline.grossMargin },
      current: { contractValue: money(financials.current.revenue, project.currency), grossMargin: financials.current.grossMargin },
      forecast: { directCost: money(financials.forecast.directCost, project.currency), grossProfit: money(financials.forecast.grossProfit, project.currency), grossMargin: financials.forecast.grossMargin },
      openTasks: rel.tasks.filter((t) => t.status !== "done").length,
      blockedTasks: rel.tasks.filter((t) => t.status === "blocked").length,
    };
  });

  return {
    note: "Margins exclude VAT and are project economics, not cash. Currencies are listed separately and never added together.",
    total: count ?? items.length,
    limit,
    offset,
    projects: items,
  };
}

export async function projectDetail(id: string) {
  const supabase = hermesClient();
  const { data, error } = await supabase.from("projects").select(PROJECT_COLUMNS).eq("id", id).maybeSingle<ProjectJoined>();
  if (error) throw new Error(`project read failed: ${error.message}`);
  if (!data) return null;

  const project = toProject(data);
  const [related, { thresholds }] = await Promise.all([loadRelated(supabase, [project.id]), loadSettings()]);
  const rel = related[project.id];
  const financials = computeFinancials({ project, members: rel.members, tasks: rel.tasks, costs: rel.costs, changeRequests: rel.changeRequests });
  const progress = computeProgress(rel.tasks, rel.milestones, project.manualProgress);
  const health = computeHealth({ project, milestones: rel.milestones, tasks: rel.tasks, financials, progress, thresholds, today: new Date() });
  const cur = project.currency;

  return {
    note: "Financials exclude VAT. Approved change requests raise the current contract value, never the baseline.",
    project: {
      id: project.id, name: project.name, client: project.clientName, status: project.status, projectType: project.projectType,
      priority: project.priority, currency: cur, startDate: project.startDate, deadline: project.deadline, completedAt: project.completedAt,
      progressPercent: progress.percent, progressBasis: progress.basis, health: health.status,
      healthReasons: health.reasons.map((r) => ({ code: r.code, params: r.params })),
    },
    baseline: {
      revenue: money(financials.baseline.revenue, cur), directCost: money(financials.baseline.directCost, cur),
      grossProfit: money(financials.baseline.grossProfit, cur), grossMargin: financials.baseline.grossMargin, targetMargin: project.baselineTargetMargin,
    },
    current: {
      contractValue: money(financials.current.revenue, cur), directCost: money(financials.current.directCost, cur),
      grossProfit: money(financials.current.grossProfit, cur), grossMargin: financials.current.grossMargin,
      actualHours: financials.current.actualHours, estimatedHours: financials.current.estimatedHours,
    },
    forecast: {
      directCost: money(financials.forecast.directCost, cur), grossProfit: money(financials.forecast.grossProfit, cur),
      grossMargin: financials.forecast.grossMargin, basis: financials.forecast.basis,
    },
    approvedChanges: { count: financials.approvedChanges.count, revenue: money(financials.approvedChanges.revenue, cur), directCost: money(financials.approvedChanges.directCost, cur) },
    // People: name, project role and pay model only — no contact details.
    members: rel.members.filter((m) => m.status !== "removed").map((m) => ({
      id: m.id, name: m.displayName, role: m.projectRole, status: m.status, payModel: m.payModel,
      costRate: m.costRate == null ? null : money(m.costRate, m.currency ?? cur),
      plannedHours: m.plannedHours, deliveredUnits: m.deliveredUnits,
    })),
    milestones: rel.milestones.map((m) => ({ id: m.id, title: m.title, status: m.status, dueDate: m.dueDate })),
    tasks: rel.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate, estimatedHours: t.estimatedHours, actualHours: t.actualHours, assigneeMemberId: t.assigneeMemberId })),
    directCosts: rel.costs.map((c) => ({ id: c.id, label: c.label, category: c.category, estimated: money(c.estimatedCost, c.currency), actual: c.actualCost == null ? null : money(c.actualCost, c.currency) })),
    changeRequests: rel.changeRequests.map((c) => ({ id: c.id, title: c.title, status: c.status, additionalRevenue: money(c.additionalRevenue, cur), additionalDirectCost: money(c.additionalDirectCost, cur), approvedAt: c.approvedAt })),
  };
}

/** Milestones and tasks that are overdue or fall due within `days`. */
export async function deadlinesDue(days: number) {
  const supabase = hermesClient();
  const from = today();
  const to = new Date(Date.parse(`${from}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

  const { data: projectRows } = await supabase
    .from("projects").select("id, name, status, deadline")
    .in("status", ACTIVE_STATUSES as unknown as string[]).limit(PROJECT_LIST_LIMIT)
    .returns<{ id: string; name: string; status: string; deadline: string | null }[]>();
  const projects = new Map((projectRows ?? []).map((p) => [p.id, p]));
  if (!projects.size) return { from, to, projectDeadlines: [], milestones: [], tasks: [] };
  const ids = [...projects.keys()];

  const [milestones, tasks] = await Promise.all([
    supabase.from("project_milestones").select("id, project_id, title, status, due_date")
      .in("project_id", ids).neq("status", "completed").not("due_date", "is", null).lte("due_date", to)
      .order("due_date").limit(MAX_LIMIT).returns<{ id: string; project_id: string; title: string; status: string; due_date: string }[]>(),
    supabase.from("project_tasks").select("id, project_id, title, status, priority, due_date")
      .in("project_id", ids).neq("status", "done").not("due_date", "is", null).lte("due_date", to)
      .order("due_date").limit(MAX_LIMIT).returns<{ id: string; project_id: string; title: string; status: string; priority: string; due_date: string }[]>(),
  ]);

  const name = (projectId: string) => projects.get(projectId)?.name ?? null;
  return {
    from, to,
    projectDeadlines: (projectRows ?? [])
      .filter((p) => p.deadline && p.deadline <= to)
      .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""))
      .map((p) => ({ projectId: p.id, project: p.name, dueDate: p.deadline, overdue: (p.deadline as string) < from })),
    milestones: (milestones.data ?? []).map((m) => ({ id: m.id, projectId: m.project_id, project: name(m.project_id), title: m.title, status: m.status, dueDate: m.due_date, overdue: m.due_date < from })),
    tasks: (tasks.data ?? []).map((t) => ({ id: t.id, projectId: t.project_id, project: name(t.project_id), title: t.title, status: t.status, priority: t.priority, dueDate: t.due_date, overdue: t.due_date < from })),
  };
}

/** Projects that cannot be marked completed because a required QA checklist is unapproved. */
export async function qaBlockers() {
  const supabase = hermesClient();
  const { data: projectRows } = await supabase
    .from("projects").select("id, name, status, deadline")
    .in("status", ACTIVE_STATUSES as unknown as string[]).limit(PROJECT_LIST_LIMIT)
    .returns<{ id: string; name: string; status: string; deadline: string | null }[]>();
  const projects = projectRows ?? [];
  if (!projects.length) return { note: "Nothing in delivery.", projects: [] };

  const { data: checklists } = await supabase
    .from("qa_checklists").select("id, project_id, title, status, required_for_completion, due_date")
    .in("project_id", projects.map((p) => p.id))
    .returns<Pick<QaChecklistRow, "id" | "project_id" | "title" | "status" | "required_for_completion" | "due_date">[]>();

  const day = today();
  const blocked = projects.flatMap((p) => {
    const mine = (checklists ?? []).filter((c) => c.project_id === p.id);
    const gate = completionGate(mine.map((c) => ({ id: c.id, title: c.title, status: c.status, requiredForCompletion: c.required_for_completion })));
    if (gate.allowed) return [];
    return [{
      projectId: p.id, project: p.name, projectStatus: p.status, deadline: p.deadline,
      blocking: gate.blocking.map((b) => {
        const row = mine.find((c) => c.id === b.id);
        return { checklistId: b.id, title: b.title, status: b.status, dueDate: row?.due_date ?? null, overdue: Boolean(row?.due_date && row.due_date < day && b.status !== "approved") };
      }),
    }];
  });

  return {
    note: "A project with a required QA checklist cannot be set to completed until that checklist is approved. QA approval says nothing about payment.",
    projects: blocked,
  };
}
