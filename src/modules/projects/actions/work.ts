"use server";

import { getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { currentActor } from "@/modules/sourcing/services/actor";
import { logActivity } from "@/modules/sourcing/services/activity";

import { MILESTONE_STATUSES, TASK_STATUSES } from "../constants";
import type { ActionResult, MilestoneStatus, TaskStatus } from "../types";
import { validateMilestone, validateTask } from "../validation";
import { fail, revalidateProjects } from "./shared";

export async function saveMilestone(projectId: string, raw: unknown, milestoneId?: string): Promise<ActionResult> {
  const dict = await getDictionary();
  const v = validateMilestone(raw, dict.projects.validation);
  if (v.errors) return v.errors;
  const m = v.data;
  const supabase = await createClient();
  const row = { title: m.title, description: m.description, due_date: m.dueDate, owner_member_id: m.ownerMemberId, status: m.status, notes: m.notes, completed_at: m.status === "completed" ? new Date().toISOString() : null };
  if (milestoneId) {
    const { error } = await supabase.from("project_milestones").update(row).eq("id", milestoneId);
    if (error) return fail(error.message);
  } else {
    const { data: last } = await supabase.from("project_milestones").select("position").eq("project_id", projectId).order("position", { ascending: false }).limit(1).maybeSingle<{ position: number }>();
    const { error } = await supabase.from("project_milestones").insert({ ...row, project_id: projectId, position: (last?.position ?? -1) + 1 });
    if (error) return fail(error.message);
  }
  revalidateProjects();
  return {};
}

export async function setMilestoneStatus(projectId: string, milestoneId: string, status: MilestoneStatus): Promise<ActionResult> {
  if (!MILESTONE_STATUSES.includes(status)) return {};
  const supabase = await createClient();
  const actor = await currentActor();
  const { data, error } = await supabase.from("project_milestones").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", milestoneId).select("title").single<{ title: string }>();
  if (error) return fail(error.message);
  if (status === "completed") await logActivity(supabase, [{ entityType: "project", entityId: projectId, action: "milestone_completed", details: { title: data?.title } }], actor);
  revalidateProjects();
  return {};
}

export async function deleteMilestone(milestoneId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("project_milestones").delete().eq("id", milestoneId);
  if (error) return fail(error.message);
  revalidateProjects();
  return {};
}

export async function saveTask(projectId: string, raw: unknown, taskId?: string): Promise<ActionResult & { id?: string }> {
  const dict = await getDictionary();
  const v = validateTask(raw, dict.projects.validation);
  if (v.errors) return v.errors;
  const t = v.data;
  const supabase = await createClient();
  const actor = await currentActor();
  const row = {
    title: t.title, description: t.description, milestone_id: t.milestoneId, assignee_member_id: t.assigneeMemberId, status: t.status, priority: t.priority,
    estimated_hours: t.estimatedHours, actual_hours: t.actualHours, start_date: t.startDate, due_date: t.dueDate, blocked_reason: t.status === "blocked" ? t.blockedReason : null, notes: t.notes,
  };
  if (taskId) {
    const { data: before } = await supabase.from("project_tasks").select("status").eq("id", taskId).maybeSingle<{ status: TaskStatus }>();
    const { error } = await supabase.from("project_tasks").update({ ...row, completed_at: t.status === "done" ? new Date().toISOString() : null }).eq("id", taskId);
    if (error) return fail(error.message);
    if (t.status === "done" && before?.status !== "done") await logActivity(supabase, [{ entityType: "project", entityId: projectId, action: "task_completed", details: { title: t.title } }], actor);
  } else {
    const { data: last } = await supabase.from("project_tasks").select("position").eq("project_id", projectId).order("position", { ascending: false }).limit(1).maybeSingle<{ position: number }>();
    const { data: created, error } = await supabase.from("project_tasks").insert({ ...row, project_id: projectId, position: (last?.position ?? -1) + 1, completed_at: t.status === "done" ? new Date().toISOString() : null }).select("id").single<{ id: string }>();
    if (error) return fail(error.message);
    revalidateProjects();
    return { id: created?.id };
  }
  revalidateProjects();
  return {};
}

export async function setTaskStatus(projectId: string, taskId: string, status: TaskStatus): Promise<ActionResult> {
  if (!TASK_STATUSES.includes(status)) return {};
  const supabase = await createClient();
  const actor = await currentActor();
  const { data: before } = await supabase.from("project_tasks").select("status, title").eq("id", taskId).maybeSingle<{ status: TaskStatus; title: string }>();
  const { error } = await supabase.from("project_tasks").update({ status, completed_at: status === "done" ? new Date().toISOString() : null }).eq("id", taskId);
  if (error) return fail(error.message);
  if (status === "done" && before?.status !== "done") await logActivity(supabase, [{ entityType: "project", entityId: projectId, action: "task_completed", details: { title: before?.title } }], actor);
  revalidateProjects();
  return {};
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("project_tasks").delete().eq("id", taskId);
  if (error) return fail(error.message);
  revalidateProjects();
  return {};
}
