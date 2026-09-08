import type { QaChecklistStatus, QaItemStatus } from "@/types/database";

export type { QaChecklistStatus, QaItemStatus };

/** Reusable standard for one kind of delivery. */
export interface QaTemplate {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  description: string | null;
  /** Recommended projects.project_type value, or null. */
  projectType: string | null;
  isActive: boolean;
  position: number;
  seedKey: string | null;
  items: QaTemplateItem[];
}

export interface QaTemplateItem {
  id: string;
  templateId: string;
  category: string;
  title: string;
  description: string | null;
  isRequired: boolean;
  allowNa: boolean;
  position: number;
}

/** Template list row with usage. */
export interface QaTemplateSummary {
  id: string;
  name: string;
  description: string | null;
  projectType: string | null;
  isActive: boolean;
  position: number;
  seedKey: string | null;
  itemCount: number;
  requiredCount: number;
  usedByProjects: number;
}

/** A frozen copy of a template item inside a project checklist + its review state. */
export interface QaChecklistItem {
  id: string;
  checklistId: string;
  templateItemId: string | null;
  category: string;
  title: string;
  description: string | null;
  isRequired: boolean;
  allowNa: boolean;
  position: number;
  status: QaItemStatus;
  note: string | null;
  evidenceUrl: string | null;
  assigneeMemberId: string | null;
  fixTaskId: string | null;
  checkedAt: string | null;
  checkedBy: string | null;
}

export interface QaChecklist {
  id: string;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  templateId: string | null;
  templateName: string;
  title: string;
  status: QaChecklistStatus;
  reviewerId: string | null;
  reviewerName: string | null;
  dueDate: string | null;
  requiredForCompletion: boolean;
  deliveryQuantity: number | null;
  sampleQuantity: number | null;
  samplingNote: string | null;
  startedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  items: QaChecklistItem[];
}

/** Derived numbers for one checklist (pure). */
export interface QaProgress {
  total: number;
  resolved: number;
  passed: number;
  failed: number;
  blocked: number;
  na: number;
  pending: number;
  requiredTotal: number;
  requiredResolved: number;
  /** Percent of items resolved (pass / fail / na / blocked). */
  percent: number;
}

/** What the status rules need: item states only. */
export type QaItemState = Pick<QaChecklistItem, "status" | "isRequired" | "allowNa">;

export interface ApprovalCheck {
  eligible: boolean;
  /** Human-readable reason codes when not eligible. */
  reasons: ("required_pending" | "required_failed" | "has_failed" | "has_blocked" | "invalid_na")[];
}

/** Checklist row for the QA overview and the Project QA tab. */
export interface QaChecklistOverview {
  id: string;
  title: string;
  templateName: string;
  status: QaChecklistStatus;
  projectId: string;
  projectName: string;
  clientName: string | null;
  projectType: string;
  projectDeadline: string | null;
  projectOwnerName: string | null;
  reviewerId: string | null;
  reviewerName: string | null;
  dueDate: string | null;
  requiredForCompletion: boolean;
  approvedByName: string | null;
  approvedAt: string | null;
  progress: QaProgress;
  overdue: boolean;
}

export type QaAttentionGroup = "needs_attention" | "ready_for_review" | "in_progress" | "not_started" | "approved";

export interface QaFilters {
  q?: string;
  status?: QaChecklistStatus;
  projectId?: string;
  projectType?: string;
  reviewerId?: string;
  failedOnly?: boolean;
  awaitingReview?: boolean;
  approvedOnly?: boolean;
  overdueOnly?: boolean;
}

/** Compact summary for the Project header / overview and the QA tab. */
export interface ProjectQaSummary {
  projectId: string;
  checklists: number;
  requiredChecklists: number;
  approvedRequired: number;
  failed: number;
  blocked: number;
  overdue: number;
  /** Most urgent checklist status across the project, null when there is none. */
  status: QaChecklistStatus | null;
  /** True when at least one required checklist is not approved. */
  blocksCompletion: boolean;
}

/** Minimal state needed by the project completion gate. */
export interface RequiredChecklistState {
  id: string;
  title: string;
  status: QaChecklistStatus;
  requiredForCompletion: boolean;
}

export interface CompletionGate {
  allowed: boolean;
  blocking: RequiredChecklistState[];
}

export interface QaStats {
  projectsWithQa: number;
  needsFixes: number;
  readyForReview: number;
  inProgress: number;
  approvedThisMonth: number;
  overdue: number;
}

export interface QaAttentionItem {
  checklistId: string;
  projectId: string;
  projectName: string;
  title: string;
  reason: "failed" | "blocked" | "overdue" | "ready_for_review";
  count: number;
  dueDate: string | null;
}

export interface TemplateInput {
  name: string;
  description: string | null;
  projectType: string | null;
  isActive: boolean;
}

export interface TemplateItemInput {
  category: string;
  title: string;
  description: string | null;
  isRequired: boolean;
  allowNa: boolean;
}

export interface ChecklistInput {
  title: string;
  reviewerId: string | null;
  dueDate: string | null;
  requiredForCompletion: boolean;
  deliveryQuantity: number | null;
  sampleQuantity: number | null;
  samplingNote: string | null;
}

export interface ItemUpdateInput {
  status: QaItemStatus;
  note: string | null;
  evidenceUrl: string | null;
  assigneeMemberId: string | null;
}

export interface ActionResult {
  error?: string;
  fieldErrors?: Record<string, string>;
}
