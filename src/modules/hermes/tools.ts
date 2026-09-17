import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";

import type { CrmStage } from "@/modules/sales/types";
import type { PendingActionStatus } from "@/types/database";

import { PENDING_ROUTE } from "./constants";
import { createProposal, listPending } from "./proposals";
import { financeOverview } from "./reads/finance";
import { capacitySnapshot, talentAvailable } from "./reads/people";
import { deadlinesDue, projectDetail, projectsOverview, qaBlockers } from "./reads/projects";
import { salesPipeline } from "./reads/sales";
import {
  capacitySnapshotSchema, clientNoteAddSchema, deadlinesDueSchema, dealStageSetSchema, financeOverviewSchema,
  pendingListSchema, projectDetailSchema, projectStatusSetSchema, projectsOverviewSchema, qaBlockersSchema,
  receivableMarkPaidSchema, salesPipelineSchema, talentAvailableSchema, taskCreateSchema,
} from "./schemas";

/**
 * The tools Hermes can call.
 *
 * Reads answer from the enumerated queries in `reads/`; they never return
 * secrets, e-mail addresses or phone numbers. Writes only ever record a
 * proposal in `pending_actions` — approval is a human action in the app.
 */

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

const ok = (data: unknown): ToolResult => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
const failed = (error: unknown): ToolResult => ({
  content: [{ type: "text", text: JSON.stringify({ error: error instanceof Error ? error.message : "unknown error" }, null, 2) }],
  isError: true,
});

/** Keeps one failing tool from taking the connection down, and hides stack traces. */
async function run(name: string, work: () => Promise<unknown>): Promise<ToolResult> {
  try {
    return ok(await work());
  } catch (error) {
    console.error(`[hermes] tool ${name} failed:`, error instanceof Error ? error.message : error);
    return failed(error);
  }
}

export function registerHermesTools(server: McpServer) {
  // ---------------------------------------------------------------- reads ---
  server.registerTool(
    "projects_overview",
    {
      title: "Projects overview",
      description: "Projects with status, client, currency, margins and the health signal. Margins are project economics excluding VAT — not cash. Currencies are never added together.",
      inputSchema: projectsOverviewSchema,
    },
    async (args) => run("projects_overview", () => projectsOverview(args))
  );

  server.registerTool(
    "project_detail",
    {
      title: "Project detail",
      description: "One project: sold baseline, current and forecast economics, approved change requests, team, milestones, tasks and direct costs.",
      inputSchema: projectDetailSchema,
    },
    async ({ id }) => run("project_detail", async () => (await projectDetail(id)) ?? { error: "project not found" })
  );

  server.registerTool(
    "deadlines_due",
    {
      title: "Deadlines due",
      description: "Project deadlines, milestones and tasks that are overdue or fall due within the next N days.",
      inputSchema: deadlinesDueSchema,
    },
    async ({ days }) => run("deadlines_due", () => deadlinesDue(days ?? 7))
  );

  server.registerTool(
    "sales_pipeline",
    {
      title: "Sales pipeline",
      description: "Open deals by stage with value and weighted value per currency. Pipeline value is neither revenue nor cash.",
      inputSchema: salesPipelineSchema,
    },
    async (args) => run("sales_pipeline", () => salesPipeline(args))
  );

  server.registerTool(
    "finance_overview",
    {
      title: "Finance overview",
      description: "Cash accounts, overdue receivables and payables and recurring costs, per currency. This is cash timing (VAT included), never project profit.",
      inputSchema: financeOverviewSchema,
    },
    async () => run("finance_overview", () => financeOverview())
  );

  server.registerTool(
    "capacity_snapshot",
    {
      title: "Capacity snapshot",
      description: "Who has how many hours free between two dates, from Talent capacity and Projects assignments. Hours, never money.",
      inputSchema: capacitySnapshotSchema,
    },
    async ({ from, to }) => run("capacity_snapshot", () => capacitySnapshot({ from, to }))
  );

  server.registerTool(
    "qa_blockers",
    {
      title: "QA blockers",
      description: "Projects that cannot be marked completed because a required QA checklist is not approved.",
      inputSchema: qaBlockersSchema,
    },
    async () => run("qa_blockers", () => qaBlockers())
  );

  server.registerTool(
    "talent_available",
    {
      title: "Available talent",
      description: "Bench people marked available, with role, rate and availability. Contact details are never returned.",
      inputSchema: talentAvailableSchema,
    },
    async (args) => run("talent_available", () => talentAvailable(args))
  );

  // ------------------------------------------------------------ proposals ---
  const proposalNote = `Records a proposal only — nothing changes until a GRAFIQ user approves it at ${PENDING_ROUTE}.`;

  server.registerTool(
    "project_status_set",
    { title: "Propose a project status change", description: `Propose moving a project to another status. ${proposalNote}`, inputSchema: projectStatusSetSchema },
    async ({ projectId, status, reason }) =>
      run("project_status_set", () => createProposal({ actionType: "project_status_set", targetTable: "projects", targetId: projectId, payload: { status }, reason }))
  );

  server.registerTool(
    "deal_stage_set",
    { title: "Propose a deal stage change", description: `Propose moving a CRM deal to another stage. ${proposalNote}`, inputSchema: dealStageSetSchema },
    async ({ companyId, stage, lostReason, reason }) =>
      run("deal_stage_set", () => createProposal({
        actionType: "deal_stage_set", targetTable: "company_leads", targetId: companyId,
        payload: { stage: stage as CrmStage, lostReason: lostReason ?? null }, reason,
      }))
  );

  server.registerTool(
    "receivable_mark_paid",
    { title: "Propose recording a client payment", description: `Propose recording money received against a receivable. Partial payments are fine. ${proposalNote}`, inputSchema: receivableMarkPaidSchema },
    async ({ receivableId, amount, currency, occurredAt, accountId, reason }) =>
      run("receivable_mark_paid", () => createProposal({
        actionType: "receivable_mark_paid", targetTable: "finance_receivables", targetId: receivableId,
        payload: { amount: amount ?? null, currency: currency ?? null, occurredAt: occurredAt ?? null, accountId: accountId ?? null }, reason,
      }))
  );

  server.registerTool(
    "task_create",
    { title: "Propose a new task", description: `Propose creating a task on a project. ${proposalNote}`, inputSchema: taskCreateSchema },
    async ({ projectId, title, dueDate, estimatedHours, milestoneId, assigneeMemberId, reason }) =>
      run("task_create", () => createProposal({
        actionType: "task_create", targetTable: "project_tasks", targetId: projectId,
        payload: { title, dueDate: dueDate ?? null, estimatedHours: estimatedHours ?? null, milestoneId: milestoneId ?? null, assigneeMemberId: assigneeMemberId ?? null }, reason,
      }))
  );

  server.registerTool(
    "client_note_add",
    { title: "Propose an internal note", description: `Propose adding an internal note to a client company. ${proposalNote}`, inputSchema: clientNoteAddSchema },
    async ({ companyId, body, reason }) =>
      run("client_note_add", () => createProposal({ actionType: "client_note_add", targetTable: "internal_notes", targetId: companyId, payload: { body }, reason }))
  );

  server.registerTool(
    "pending_list",
    { title: "Proposals and their decisions", description: "Proposals waiting for a human, and what was approved or rejected.", inputSchema: pendingListSchema },
    async ({ status, limit }) => run("pending_list", () => listPending({ status: status as PendingActionStatus | undefined, limit }))
  );
}
