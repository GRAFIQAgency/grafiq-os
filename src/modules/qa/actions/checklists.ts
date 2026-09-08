"use server";

import { getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/queries";
import { saveTask } from "@/modules/projects/actions/work";
import { currentActor } from "@/modules/sourcing/services/actor";
import { logActivity, type ActivityAction } from "@/modules/sourcing/services/activity";
import type { QaChecklistItemRow, QaChecklistRow, QaTemplateItemRow, QaTemplateRow } from "@/types/database";

import { approve, deriveStatus, nextChecklistState } from "../calculations/checklist";
import { fixTaskTitle, snapshotItems } from "../calculations/snapshot";
import { FIX_TASK_PREFIX } from "../constants";
import { rowToTemplateItem } from "../queries";
import type { ActionResult, QaItemState } from "../types";
import { validateChecklist, validateItemUpdate } from "../validation";
import { fail, revalidateQa } from "./shared";

export interface ChecklistResult extends ActionResult {
  id?: string;
}

type ItemState = Pick<QaChecklistItemRow, "id" | "status" | "is_required" | "allow_na">;
const toState = (rows: ItemState[]): QaItemState[] => rows.map((r) => ({ status: r.status, isRequired: r.is_required, allowNa: r.allow_na }));

async function log(projectId: string, action: ActivityAction, details: Record<string, unknown>) {
  const supabase = await createClient();
  await logActivity(supabase, [{ entityType: "project", entityId: projectId, action, details }], await currentActor());
}

/**
 * Start QA: creates a checklist from a template and SNAPSHOTS the template
 * items into it. From this point the checklist never re-reads the template.
 */
export async function createChecklist(projectId: string, templateId: string, raw: unknown): Promise<ChecklistResult> {
  const dict = await getDictionary();
  const supabase = await createClient();
  const user = await getCurrentUser();
  const [{ data: template }, { data: templateItems }] = await Promise.all([
    supabase.from("qa_templates").select("*").eq("id", templateId).maybeSingle<QaTemplateRow>(),
    supabase.from("qa_template_items").select("*").eq("template_id", templateId).order("position").returns<QaTemplateItemRow[]>(),
  ]);
  if (!template) return { error: dict.qa.errors.notFound };
  const v = validateChecklist({ ...(typeof raw === "object" && raw ? raw : {}), title: (raw as Record<string, unknown> | null)?.title || template.name }, dict.qa.validation);
  if (v.errors) return v.errors;
  const d = v.data;

  const { data: created, error } = await supabase.from("qa_checklists").insert({
    project_id: projectId, template_id: template.id, template_name: template.name, title: d.title, reviewer_id: d.reviewerId, due_date: d.dueDate,
    required_for_completion: d.requiredForCompletion, delivery_quantity: d.deliveryQuantity, sample_quantity: d.sampleQuantity, sampling_note: d.samplingNote,
    created_by: user?.user.id ?? null,
  }).select("id").single<{ id: string }>();
  if (error || !created) return fail(error?.message);

  const snapshot = snapshotItems((templateItems ?? []).map(rowToTemplateItem));
  if (snapshot.length) {
    const { error: e2 } = await supabase.from("qa_checklist_items").insert(snapshot.map((s) => ({
      checklist_id: created.id, template_item_id: s.templateItemId, category: s.category, title: s.title, description: s.description,
      is_required: s.isRequired, allow_na: s.allowNa, position: s.position,
    })));
    if (e2) return fail(e2.message);
  }
  await log(projectId, "qa_checklist_created", { title: d.title, template: template.name, items: snapshot.length });
  revalidateQa(projectId);
  return { id: created.id };
}

/** Header fields: title, reviewer, due date, required flag, sampling. */
export async function updateChecklist(id: string, raw: unknown): Promise<ActionResult> {
  const dict = await getDictionary();
  const v = validateChecklist(raw, dict.qa.validation);
  if (v.errors) return v.errors;
  const d = v.data;
  const supabase = await createClient();
  const { data, error } = await supabase.from("qa_checklists").update({
    title: d.title, reviewer_id: d.reviewerId, due_date: d.dueDate, required_for_completion: d.requiredForCompletion,
    delivery_quantity: d.deliveryQuantity, sample_quantity: d.sampleQuantity, sampling_note: d.samplingNote,
  }).eq("id", id).select("project_id").maybeSingle<{ project_id: string }>();
  if (error) return fail(error.message);
  revalidateQa(data?.project_id);
  return {};
}

/** Loads the checklist + item states and writes the derived status (clearing approval when it became invalid). */
async function syncChecklist(checklistId: string, opts: { markStarted?: boolean } = {}): Promise<{ checklist: QaChecklistRow; status: QaChecklistRow["status"]; approvalRevoked: boolean; readyNow: boolean } | null> {
  const supabase = await createClient();
  const [{ data: checklist }, { data: items }] = await Promise.all([
    supabase.from("qa_checklists").select("*").eq("id", checklistId).maybeSingle<QaChecklistRow>(),
    supabase.from("qa_checklist_items").select("id, status, is_required, allow_na").eq("checklist_id", checklistId).returns<ItemState[]>(),
  ]);
  if (!checklist) return null;
  const next = nextChecklistState(toState(items ?? []), { status: checklist.status, approvedAt: checklist.approved_at, approvedBy: checklist.approved_by });
  const patch: Partial<QaChecklistRow> = { status: next.status, approved_at: next.approvedAt, approved_by: next.approvedBy };
  if (opts.markStarted && !checklist.started_at && next.status !== "not_started") patch.started_at = new Date().toISOString();
  await supabase.from("qa_checklists").update(patch).eq("id", checklistId);
  return { checklist, status: next.status, approvalRevoked: next.approvalRevoked, readyNow: next.status === "ready_for_review" && checklist.status !== "ready_for_review" };
}

/** Review one item: status (N/A only where allowed), note, evidence, assignee. Recomputes the checklist. */
export async function updateItem(itemId: string, raw: unknown): Promise<ActionResult> {
  const dict = await getDictionary();
  const supabase = await createClient();
  const user = await getCurrentUser();
  const { data: item } = await supabase.from("qa_checklist_items").select("*").eq("id", itemId).maybeSingle<QaChecklistItemRow>();
  if (!item) return { error: dict.qa.errors.notFound };
  const v = validateItemUpdate(raw, { allowNa: item.allow_na }, dict.qa.validation);
  if (v.errors) return v.errors;
  const d = v.data;
  const changedStatus = d.status !== item.status;
  const { error } = await supabase.from("qa_checklist_items").update({
    status: d.status, note: d.note, evidence_url: d.evidenceUrl, assignee_member_id: d.assigneeMemberId,
    checked_at: d.status === "pending" ? null : changedStatus || !item.checked_at ? new Date().toISOString() : item.checked_at,
    checked_by: d.status === "pending" ? null : changedStatus || !item.checked_by ? user?.user.id ?? null : item.checked_by,
  }).eq("id", itemId);
  if (error) return fail(error.message);

  const synced = await syncChecklist(item.checklist_id, { markStarted: true });
  if (synced) {
    const projectId = synced.checklist.project_id;
    if (!synced.checklist.started_at && synced.status !== "not_started") await log(projectId, "qa_started", { title: synced.checklist.title });
    if (changedStatus && (d.status === "fail" || d.status === "blocked")) await log(projectId, "qa_item_failed", { item: item.title, status: d.status, checklist: synced.checklist.title });
    if (synced.readyNow) await log(projectId, "qa_ready_for_review", { title: synced.checklist.title });
    if (synced.approvalRevoked) await log(projectId, "qa_approval_revoked", { title: synced.checklist.title, item: item.title });
    revalidateQa(projectId);
  }
  return {};
}

/** Explicit approval: only when every required item is pass / allowed N/A and nothing is failed or blocked. */
export async function approveChecklist(id: string): Promise<ActionResult> {
  const dict = await getDictionary();
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: dict.pricing.errors.mustSignIn };
  const [{ data: checklist }, { data: items }] = await Promise.all([
    supabase.from("qa_checklists").select("*").eq("id", id).maybeSingle<QaChecklistRow>(),
    supabase.from("qa_checklist_items").select("id, status, is_required, allow_na").eq("checklist_id", id).returns<ItemState[]>(),
  ]);
  if (!checklist) return { error: dict.qa.errors.notFound };
  const result = approve(toState(items ?? []), user.user.id, new Date().toISOString());
  if (!result) return { error: dict.qa.errors.notEligible };
  const { error } = await supabase.from("qa_checklists").update({ status: result.status, approved_at: result.approvedAt, approved_by: result.approvedBy }).eq("id", id);
  if (error) return fail(error.message);
  await log(checklist.project_id, "qa_approved", { title: checklist.title });
  revalidateQa(checklist.project_id);
  return {};
}

export async function revokeApproval(id: string): Promise<ActionResult> {
  const dict = await getDictionary();
  const supabase = await createClient();
  const [{ data: checklist }, { data: items }] = await Promise.all([
    supabase.from("qa_checklists").select("*").eq("id", id).maybeSingle<QaChecklistRow>(),
    supabase.from("qa_checklist_items").select("id, status, is_required, allow_na").eq("checklist_id", id).returns<ItemState[]>(),
  ]);
  if (!checklist) return { error: dict.qa.errors.notFound };
  const { error } = await supabase.from("qa_checklists").update({ status: deriveStatus(toState(items ?? [])), approved_at: null, approved_by: null }).eq("id", id);
  if (error) return fail(error.message);
  await log(checklist.project_id, "qa_approval_revoked", { title: checklist.title, manual: true });
  revalidateQa(checklist.project_id);
  return {};
}

/**
 * Failed / blocked item → a normal project task ("QA: <item>"), linked from
 * the item. Finishing the task never passes the item: the reviewer re-checks.
 */
export async function createFixTask(itemId: string, raw: { assigneeMemberId?: string | null; milestoneId?: string | null }): Promise<ActionResult & { taskId?: string }> {
  const dict = await getDictionary();
  const supabase = await createClient();
  const { data: item } = await supabase.from("qa_checklist_items").select("*").eq("id", itemId).maybeSingle<QaChecklistItemRow>();
  if (!item) return { error: dict.qa.errors.notFound };
  if (item.status !== "fail" && item.status !== "blocked") return { error: dict.qa.errors.fixTaskOnlyForFailed };
  const { data: checklist } = await supabase.from("qa_checklists").select("id, project_id, title").eq("id", item.checklist_id).maybeSingle<Pick<QaChecklistRow, "id" | "project_id" | "title">>();
  if (!checklist) return { error: dict.qa.errors.notFound };

  const created = await saveTask(checklist.project_id, {
    title: fixTaskTitle(FIX_TASK_PREFIX, item.title),
    description: [item.note, item.evidence_url].filter(Boolean).join("\n") || null,
    status: "todo", priority: item.status === "blocked" ? "high" : "normal",
    assigneeMemberId: raw?.assigneeMemberId || item.assignee_member_id || "", milestoneId: raw?.milestoneId || "",
  });
  if (created.error || !created.id) return { error: created.error ?? dict.qa.errors.saveFailed };
  const { error } = await supabase.from("qa_checklist_items").update({ fix_task_id: created.id }).eq("id", itemId);
  if (error) return fail(error.message);
  await log(checklist.project_id, "qa_fix_task_created", { item: item.title, checklist: checklist.title });
  revalidateQa(checklist.project_id);
  return { taskId: created.id };
}

export async function deleteChecklist(id: string): Promise<ActionResult> {
  const dict = await getDictionary();
  const supabase = await createClient();
  const { data: checklist } = await supabase.from("qa_checklists").select("id, project_id, title").eq("id", id).maybeSingle<Pick<QaChecklistRow, "id" | "project_id" | "title">>();
  if (!checklist) return { error: dict.qa.errors.notFound };
  const { error } = await supabase.from("qa_checklists").delete().eq("id", id);
  if (error) return fail(error.message);
  await log(checklist.project_id, "qa_checklist_deleted", { title: checklist.title });
  revalidateQa(checklist.project_id);
  return {};
}
