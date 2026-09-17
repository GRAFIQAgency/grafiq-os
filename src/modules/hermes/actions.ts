"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/modules/auth/queries";
import { createClient } from "@/lib/supabase/server";
import { recordReceivablePayment } from "@/modules/finance/actions/payments";
import { setProjectStatus } from "@/modules/projects/actions/projects";
import { saveTask } from "@/modules/projects/actions/work";
import type { ProjectStatus } from "@/modules/projects/types";
import { setDealStage } from "@/modules/sales/actions";
import type { CrmStage } from "@/modules/sales/types";
import { addNote } from "@/modules/sourcing/actions/notes";
import type { PendingActionRow } from "@/types/database";

import { PENDING_ROUTE } from "./constants";

/**
 * Approving a proposal.
 *
 * The queue row itself never touches application data. Approval calls the very
 * Server Action the UI calls, as the signed-in user — so the QA completion
 * gate, the validation messages, the activity log and RLS all apply exactly as
 * if Alex had clicked the button himself. If that action refuses, the proposal
 * stays pending and the reason is stored on the row.
 */

export interface DecisionResult {
  error?: string;
}

const str = (payload: Record<string, unknown>, key: string): string | undefined => {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value : undefined;
};
const num = (payload: Record<string, unknown>, key: string): number | undefined => {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
};

/** Runs one approved proposal through the normal application path. */
async function execute(row: PendingActionRow): Promise<{ error?: string; result: string }> {
  const p = row.payload ?? {};
  switch (row.action_type) {
    case "project_status_set": {
      const status = str(p, "status") as ProjectStatus | undefined;
      if (!status) return { error: "the proposal has no status", result: "invalid payload" };
      const r = await setProjectStatus(row.target_id, status);
      return { error: r.error, result: r.error ? `refused: ${r.error}` : `project status set to ${status}` };
    }
    case "deal_stage_set": {
      const stage = str(p, "stage") as CrmStage | undefined;
      if (!stage) return { error: "the proposal has no stage", result: "invalid payload" };
      const r = await setDealStage(row.target_id, stage, str(p, "lostReason") ?? null);
      return { error: r.error, result: r.error ? `refused: ${r.error}` : `deal stage set to ${stage}` };
    }
    case "receivable_mark_paid": {
      const amount = num(p, "amount");
      const r = await recordReceivablePayment(row.target_id, {
        amount: amount ?? "",
        occurredAt: str(p, "occurredAt") ?? "",
        accountId: str(p, "accountId") ?? "",
        note: `Approved from ${PENDING_ROUTE}`,
      });
      const fieldError = r.fieldErrors ? Object.values(r.fieldErrors)[0] : undefined;
      const error = r.error ?? fieldError;
      return { error, result: error ? `refused: ${error}` : `payment recorded${amount ? ` (${amount})` : ""}` };
    }
    case "task_create": {
      const title = str(p, "title");
      if (!title) return { error: "the proposal has no title", result: "invalid payload" };
      const r = await saveTask(row.target_id, {
        title,
        dueDate: str(p, "dueDate") ?? "",
        estimatedHours: num(p, "estimatedHours") ?? "",
        milestoneId: str(p, "milestoneId") ?? "",
        assigneeMemberId: str(p, "assigneeMemberId") ?? "",
        status: "todo",
        priority: "normal",
      });
      const fieldError = r.fieldErrors ? Object.values(r.fieldErrors)[0] : undefined;
      const error = r.error ?? fieldError;
      return { error, result: error ? `refused: ${error}` : `task created: ${title}` };
    }
    case "client_note_add": {
      const body = str(p, "body");
      if (!body) return { error: "the proposal has no note text", result: "invalid payload" };
      const r = await addNote("company", row.target_id, body);
      return { error: r.error, result: r.error ? `refused: ${r.error}` : "note added" };
    }
  }
}

async function loadPending(id: string): Promise<{ row?: PendingActionRow; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("pending_actions").select("*").eq("id", id).maybeSingle<PendingActionRow>();
  if (error) return { error: error.message };
  if (!data) return { error: "This proposal no longer exists." };
  if (data.status !== "pending") return { error: "This proposal has already been decided." };
  return { row: data };
}

export async function approvePendingAction(id: string): Promise<DecisionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };
  const { row, error } = await loadPending(id);
  if (!row) return { error };

  const outcome = await execute(row);
  const supabase = await createClient();

  if (outcome.error) {
    // The application refused it — record why and leave the proposal open.
    await supabase.from("pending_actions").update({ result: outcome.result }).eq("id", id);
    revalidatePath(PENDING_ROUTE);
    return { error: outcome.error };
  }

  await supabase
    .from("pending_actions")
    .update({ status: "approved", decided_at: new Date().toISOString(), decided_by: user.user.id, result: outcome.result })
    .eq("id", id);
  revalidatePath(PENDING_ROUTE);
  return {};
}

export async function rejectPendingAction(id: string, note?: string): Promise<DecisionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };
  const { row, error } = await loadPending(id);
  if (!row) return { error };

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("pending_actions")
    .update({
      status: "rejected",
      decided_at: new Date().toISOString(),
      decided_by: user.user.id,
      result: typeof note === "string" && note.trim() ? `rejected: ${note.trim().slice(0, 500)}` : "rejected",
    })
    .eq("id", id);
  if (updateError) return { error: updateError.message };
  revalidatePath(PENDING_ROUTE);
  return {};
}
