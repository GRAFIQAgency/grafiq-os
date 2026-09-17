import "server-only";

import type { PendingActionRow, PendingActionStatus, PendingActionType } from "@/types/database";

import { hermesClient } from "./client";
import { clampLimit } from "./reads/shared";
import { describeAction, type ActionDescription } from "./describe";
import { PENDING_ROUTE, PROPOSED_BY } from "./constants";

/**
 * Write tools do not write.
 *
 * Every "write" tool records a proposal in `pending_actions` and stops there.
 * Nothing in Projects, Sales, Finance or QA changes until a signed-in human
 * approves it on /admin/pending, where the approval runs the same Server
 * Action the UI uses — so the same validation, activity log and QA gates apply.
 */

export interface ProposalInput {
  actionType: PendingActionType;
  targetTable: string;
  targetId: string;
  payload: Record<string, unknown>;
  reason?: string;
}

export interface ProposalResult {
  pendingActionId: string;
  status: PendingActionStatus;
  description: ActionDescription;
  note: string;
}

export async function createProposal(input: ProposalInput): Promise<ProposalResult> {
  const supabase = hermesClient();
  const description = await describeAction(supabase, { action_type: input.actionType, target_id: input.targetId, payload: input.payload });
  if (description.missing) throw new Error(`${description.summary}. Nothing was proposed.`);

  const { data, error } = await supabase
    .from("pending_actions")
    .insert({
      action_type: input.actionType,
      target_table: input.targetTable,
      target_id: input.targetId,
      payload: input.payload,
      reason: input.reason ?? null,
      proposed_by: PROPOSED_BY,
      status: "pending",
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) throw new Error(`could not record the proposal: ${error?.message ?? "unknown error"}`);

  return {
    pendingActionId: data.id,
    status: "pending",
    description,
    note: `Recorded as a proposal only — nothing changed. A GRAFIQ user has to approve it at ${PENDING_ROUTE}.`,
  };
}

export async function listPending(input: { status?: PendingActionStatus; limit?: number }) {
  const supabase = hermesClient();
  const limit = clampLimit(input.limit);
  let query = supabase.from("pending_actions").select("*").order("created_at", { ascending: false }).limit(limit);
  if (input.status) query = query.eq("status", input.status);
  const { data, error } = await query.returns<PendingActionRow[]>();
  if (error) throw new Error(`pending actions read failed: ${error.message}`);

  const rows = data ?? [];
  const described = await Promise.all(rows.map(async (row) => ({
    id: row.id,
    actionType: row.action_type,
    status: row.status,
    reason: row.reason,
    proposedBy: row.proposed_by,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
    result: row.result,
    summary: (await describeAction(supabase, row)).summary,
  })));

  return {
    note: `Proposals waiting for a human. Approving happens in the app at ${PENDING_ROUTE}; an agent cannot approve its own proposal.`,
    actions: described,
  };
}
