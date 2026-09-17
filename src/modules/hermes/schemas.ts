import { z } from "zod";

import { CURRENCIES } from "@/config/currencies";
import { PROJECT_STATUSES } from "@/modules/projects/constants";
import { CRM_STAGES } from "@/modules/sales/constants";

import { MAX_DEADLINE_DAYS, MAX_LIMIT, MAX_RANGE_DAYS, MAX_TEXT } from "./constants";

/**
 * Every tool input is validated here before it reaches a query.
 *
 * The endpoint accepts arguments, never SQL: there is no table name, column,
 * filter expression or ordering that can be supplied from outside. Enums come
 * from the modules that own them, so an invalid status is rejected at the door.
 */

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const limit = z.number().int().min(1).max(MAX_LIMIT).optional();
const reason = z.string().trim().min(3).max(MAX_TEXT);

export const projectsOverviewSchema = z.object({
  status: z.enum(PROJECT_STATUSES as unknown as [string, ...string[]]).optional().describe("Filter by project status"),
  clientId: uuid.optional().describe("Filter by client company id"),
  limit: limit.describe("Rows to return (default 25, max 100)"),
  offset: z.number().int().min(0).optional().describe("Rows to skip, for paging"),
});

export const projectDetailSchema = z.object({
  id: uuid.describe("Project id"),
});

export const deadlinesDueSchema = z.object({
  days: z.number().int().min(0).max(MAX_DEADLINE_DAYS).default(7)
    .describe(`Look this many days ahead; overdue items are always included (max ${MAX_DEADLINE_DAYS})`),
});

export const salesPipelineSchema = z.object({
  stage: z.enum(CRM_STAGES as unknown as [string, ...string[]]).optional().describe("Filter by pipeline stage"),
  includeClosed: z.boolean().optional().describe("Include won and lost deals (default false)"),
  limit,
});

export const financeOverviewSchema = z.object({});

export const capacitySnapshotSchema = z
  .object({
    from: isoDate.describe("Start of the window (YYYY-MM-DD)"),
    to: isoDate.describe("End of the window (YYYY-MM-DD)"),
  })
  .refine((v) => v.to >= v.from, { message: "`to` must not be before `from`" })
  .refine((v) => (Date.parse(v.to) - Date.parse(v.from)) / 86400000 <= MAX_RANGE_DAYS, {
    message: `the window must not be longer than ${MAX_RANGE_DAYS} days`,
  });

export const qaBlockersSchema = z.object({});

export const talentAvailableSchema = z.object({
  role: z.string().trim().min(1).max(100).optional().describe("Match against the person's role"),
  from: isoDate.optional().describe("Needed from this date"),
  to: isoDate.optional().describe("Needed until this date"),
  limit,
});

// --- proposals (nothing is written to the app; a row lands in pending_actions) ---

export const projectStatusSetSchema = z.object({
  projectId: uuid,
  status: z.enum(PROJECT_STATUSES as unknown as [string, ...string[]]).describe("Proposed new status"),
  reason: reason.describe("Why this change is proposed"),
});

export const dealStageSetSchema = z.object({
  companyId: uuid.describe("Company id of the deal"),
  stage: z.enum(CRM_STAGES as unknown as [string, ...string[]]).describe("Proposed new pipeline stage"),
  lostReason: z.string().trim().max(MAX_TEXT).optional().describe("Required by the app when moving to 'lost'"),
  reason,
});

export const receivableMarkPaidSchema = z.object({
  receivableId: uuid,
  amount: z.number().positive().optional().describe("Payment amount; defaults to the full outstanding amount"),
  currency: z.enum(CURRENCIES as unknown as [string, ...string[]]).optional()
    .describe("Only as a cross-check: it must match the receivable's own currency"),
  occurredAt: isoDate.optional().describe("Date the money arrived (default: today)"),
  accountId: uuid.optional().describe("Cash account that received it"),
  reason,
});

export const taskCreateSchema = z.object({
  projectId: uuid,
  title: z.string().trim().min(1).max(200),
  dueDate: isoDate.optional(),
  estimatedHours: z.number().min(0).max(10_000).optional(),
  milestoneId: uuid.optional(),
  assigneeMemberId: uuid.optional().describe("project_members.id, not a person id"),
  reason,
});

export const clientNoteAddSchema = z.object({
  companyId: uuid,
  body: z.string().trim().min(1).max(5000),
  reason,
});

export const pendingListSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional().describe("Default: every status"),
  limit,
});
