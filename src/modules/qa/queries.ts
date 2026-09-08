import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { rowToMember, rowToMilestone } from "@/modules/projects/mappers";
import type { Milestone, ProjectMember } from "@/modules/projects/types";
import type { ProfileRow, ProjectMemberRow, ProjectMilestoneRow, ProjectRow, QaChecklistItemRow, QaChecklistRow, QaTemplateItemRow, QaTemplateRow } from "@/types/database";

import { isOverdue, progressOf } from "./calculations/checklist";
import { attentionItems, qaStats, summarizeProject } from "./calculations/stats";
import { QA_LIST_LIMIT } from "./constants";
import type {
  ProjectQaSummary, QaAttentionItem, QaChecklist, QaChecklistItem, QaChecklistOverview, QaStats, QaTemplate, QaTemplateItem, QaTemplateSummary, RequiredChecklistState,
} from "./types";

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

export function rowToTemplateItem(r: QaTemplateItemRow): QaTemplateItem {
  return { id: r.id, templateId: r.template_id, category: r.category, title: r.title, description: r.description, isRequired: r.is_required, allowNa: r.allow_na, position: r.position };
}

export function rowToTemplate(r: QaTemplateRow, items: QaTemplateItemRow[]): QaTemplate {
  return {
    id: r.id, createdAt: r.created_at, updatedAt: r.updated_at, name: r.name, description: r.description, projectType: r.project_type,
    isActive: r.is_active, position: r.position, seedKey: r.seed_key,
    items: items.filter((i) => i.template_id === r.id).sort((a, b) => a.position - b.position).map(rowToTemplateItem),
  };
}

export function rowToChecklistItem(r: QaChecklistItemRow): QaChecklistItem {
  return {
    id: r.id, checklistId: r.checklist_id, templateItemId: r.template_item_id, category: r.category, title: r.title, description: r.description,
    isRequired: r.is_required, allowNa: r.allow_na, position: r.position, status: r.status, note: r.note, evidenceUrl: r.evidence_url,
    assigneeMemberId: r.assignee_member_id, fixTaskId: r.fix_task_id, checkedAt: r.checked_at, checkedBy: r.checked_by,
  };
}

function rowToChecklist(r: QaChecklistRow, items: QaChecklistItemRow[], names: Map<string, string>): QaChecklist {
  return {
    id: r.id, createdAt: r.created_at, updatedAt: r.updated_at, projectId: r.project_id, templateId: r.template_id, templateName: r.template_name, title: r.title,
    status: r.status, reviewerId: r.reviewer_id, reviewerName: r.reviewer_id ? names.get(r.reviewer_id) ?? null : null, dueDate: r.due_date,
    requiredForCompletion: r.required_for_completion, deliveryQuantity: r.delivery_quantity == null ? null : Number(r.delivery_quantity),
    sampleQuantity: r.sample_quantity == null ? null : Number(r.sample_quantity), samplingNote: r.sampling_note, startedAt: r.started_at,
    approvedAt: r.approved_at, approvedBy: r.approved_by, approvedByName: r.approved_by ? names.get(r.approved_by) ?? null : null,
    items: items.filter((i) => i.checklist_id === r.id).sort((a, b) => a.position - b.position).map(rowToChecklistItem),
  };
}

const today = () => new Date().toISOString().slice(0, 10);

/** Display names for a set of auth user ids (profiles). */
async function profileNames(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  if (!unique.length) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", unique).returns<Pick<ProfileRow, "id" | "full_name" | "email">[]>();
  return new Map((data ?? []).map((p) => [p.id, p.full_name?.trim() || p.email]));
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function listTemplates(): Promise<QaTemplate[]> {
  const supabase = await createClient();
  const [t, i] = await Promise.all([
    supabase.from("qa_templates").select("*").order("position").order("name").returns<QaTemplateRow[]>(),
    supabase.from("qa_template_items").select("*").order("position").returns<QaTemplateItemRow[]>(),
  ]);
  if (t.error) {
    console.error("[qa] listTemplates failed:", t.error.message);
    return [];
  }
  return (t.data ?? []).map((r) => rowToTemplate(r, i.data ?? []));
}

export async function listTemplateSummaries(): Promise<QaTemplateSummary[]> {
  const supabase = await createClient();
  const [templates, usage] = await Promise.all([
    listTemplates(),
    supabase.from("qa_checklists").select("template_id, project_id").not("template_id", "is", null).returns<{ template_id: string; project_id: string }[]>(),
  ]);
  const projectsByTemplate = new Map<string, Set<string>>();
  for (const u of usage.data ?? []) (projectsByTemplate.get(u.template_id) ?? projectsByTemplate.set(u.template_id, new Set()).get(u.template_id)!).add(u.project_id);
  return templates.map((t) => ({
    id: t.id, name: t.name, description: t.description, projectType: t.projectType, isActive: t.isActive, position: t.position, seedKey: t.seedKey,
    itemCount: t.items.length, requiredCount: t.items.filter((i) => i.isRequired).length, usedByProjects: projectsByTemplate.get(t.id)?.size ?? 0,
  }));
}

export async function getTemplate(id: string): Promise<(QaTemplate & { usedByChecklists: number }) | null> {
  const supabase = await createClient();
  const [t, i, u] = await Promise.all([
    supabase.from("qa_templates").select("*").eq("id", id).maybeSingle<QaTemplateRow>(),
    supabase.from("qa_template_items").select("*").eq("template_id", id).order("position").returns<QaTemplateItemRow[]>(),
    supabase.from("qa_checklists").select("id", { count: "exact", head: true }).eq("template_id", id),
  ]);
  if (t.error || !t.data) return null;
  return { ...rowToTemplate(t.data, i.data ?? []), usedByChecklists: u.count ?? 0 };
}

// ---------------------------------------------------------------------------
// Checklists
// ---------------------------------------------------------------------------

type ChecklistJoined = QaChecklistRow & { projects: Pick<ProjectRow, "id" | "name" | "project_type" | "deadline" | "owner_id" | "status"> & { company_leads: { name: string } | null } };
const OVERVIEW_SELECT = "*, projects!inner(id, name, project_type, deadline, owner_id, status, company_leads(name))";

/** Every checklist with its project, progress and overdue flag (the QA overview + read API). */
export const listChecklistOverview = cache(async (): Promise<QaChecklistOverview[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("qa_checklists").select(OVERVIEW_SELECT).order("created_at", { ascending: false }).limit(QA_LIST_LIMIT).returns<ChecklistJoined[]>();
  if (error) {
    console.error("[qa] listChecklistOverview failed:", error.message);
    return [];
  }
  const rows = data ?? [];
  if (!rows.length) return [];
  const [items, names] = await Promise.all([
    supabase.from("qa_checklist_items").select("checklist_id, status, is_required, allow_na").in("checklist_id", rows.map((r) => r.id)).returns<Pick<QaChecklistItemRow, "checklist_id" | "status" | "is_required" | "allow_na">[]>(),
    profileNames(rows.flatMap((r) => [r.reviewer_id, r.approved_by, r.projects.owner_id])),
  ]);
  const day = today();
  return rows.map((r) => {
    const mine = (items.data ?? []).filter((i) => i.checklist_id === r.id).map((i) => ({ status: i.status, isRequired: i.is_required, allowNa: i.allow_na }));
    return {
      id: r.id, title: r.title, templateName: r.template_name, status: r.status, projectId: r.projects.id, projectName: r.projects.name,
      clientName: r.projects.company_leads?.name ?? null, projectType: r.projects.project_type, projectDeadline: r.projects.deadline,
      projectOwnerName: r.projects.owner_id ? names.get(r.projects.owner_id) ?? null : null,
      reviewerId: r.reviewer_id, reviewerName: r.reviewer_id ? names.get(r.reviewer_id) ?? null : null, dueDate: r.due_date,
      requiredForCompletion: r.required_for_completion, approvedByName: r.approved_by ? names.get(r.approved_by) ?? null : null, approvedAt: r.approved_at,
      progress: progressOf(mine), overdue: isOverdue(r.status, r.due_date, day),
    };
  });
});

export async function listProjectChecklists(projectId: string): Promise<QaChecklist[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("qa_checklists").select("*").eq("project_id", projectId).order("created_at").returns<QaChecklistRow[]>();
  if (error || !data?.length) return [];
  const [items, names] = await Promise.all([
    supabase.from("qa_checklist_items").select("*").in("checklist_id", data.map((r) => r.id)).order("position").returns<QaChecklistItemRow[]>(),
    profileNames(data.flatMap((r) => [r.reviewer_id, r.approved_by])),
  ]);
  return data.map((r) => rowToChecklist(r, items.data ?? [], names));
}

export interface ChecklistDetail {
  checklist: QaChecklist;
  project: { id: string; name: string; status: ProjectRow["status"]; deadline: string | null; projectType: string };
  members: ProjectMember[];
  milestones: Milestone[];
  /** Fix-task status by task id, for "Fix task → Open". */
  fixTasks: Record<string, { title: string; status: string }>;
}

export async function getChecklistDetail(id: string): Promise<ChecklistDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("qa_checklists").select("*").eq("id", id).maybeSingle<QaChecklistRow>();
  if (error || !data) return null;
  const [items, names, project, members, milestones] = await Promise.all([
    supabase.from("qa_checklist_items").select("*").eq("checklist_id", id).order("position").returns<QaChecklistItemRow[]>(),
    profileNames([data.reviewer_id, data.approved_by]),
    supabase.from("projects").select("id, name, status, deadline, project_type").eq("id", data.project_id).maybeSingle<Pick<ProjectRow, "id" | "name" | "status" | "deadline" | "project_type">>(),
    supabase.from("project_members").select("*").eq("project_id", data.project_id).returns<ProjectMemberRow[]>(),
    supabase.from("project_milestones").select("*").eq("project_id", data.project_id).order("position").returns<ProjectMilestoneRow[]>(),
  ]);
  if (!project.data) return null;
  const checklist = rowToChecklist(data, items.data ?? [], names);
  const taskIds = checklist.items.map((i) => i.fixTaskId).filter((x): x is string => Boolean(x));
  const tasks = taskIds.length ? await supabase.from("project_tasks").select("id, title, status").in("id", taskIds).returns<{ id: string; title: string; status: string }[]>() : { data: [] as { id: string; title: string; status: string }[] };
  return {
    checklist,
    project: { id: project.data.id, name: project.data.name, status: project.data.status, deadline: project.data.deadline, projectType: project.data.project_type },
    members: (members.data ?? []).map(rowToMember).filter((m) => m.status !== "removed"),
    milestones: (milestones.data ?? []).map(rowToMilestone),
    fixTasks: Object.fromEntries((tasks.data ?? []).map((t) => [t.id, { title: t.title, status: t.status }])),
  };
}

export async function listReviewers(): Promise<{ id: string; label: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name, email").order("full_name").returns<Pick<ProfileRow, "id" | "full_name" | "email">[]>();
  return (data ?? []).map((p) => ({ id: p.id, label: p.full_name?.trim() || p.email }));
}

// ---------------------------------------------------------------------------
// Read API for Projects (completion gate, header signal) and Dashboard
// ---------------------------------------------------------------------------

/** Minimal state the project completion gate needs. Fails open when the table is missing. */
export async function listRequiredChecklistStates(projectId: string): Promise<RequiredChecklistState[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("qa_checklists").select("id, title, status, required_for_completion").eq("project_id", projectId).returns<Pick<QaChecklistRow, "id" | "title" | "status" | "required_for_completion">[]>();
  if (error) {
    console.error("[qa] listRequiredChecklistStates failed:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({ id: r.id, title: r.title, status: r.status, requiredForCompletion: r.required_for_completion }));
}

export async function getProjectQaSummary(projectId: string): Promise<ProjectQaSummary> {
  const all = await listChecklistOverview();
  return summarizeProject(projectId, all.filter((c) => c.projectId === projectId));
}

export async function getQaStats(): Promise<QaStats> {
  return qaStats(await listChecklistOverview(), today());
}

export async function listQaAttentionItems(): Promise<QaAttentionItem[]> {
  return attentionItems(await listChecklistOverview());
}
