import type { ChangeRequestStatus, DirectCostCategory, MilestoneStatus, ProjectLinkKind, ProjectMemberStatus, ProjectPriority, ProjectSort, ProjectStatus, TaskStatus } from "./types";

export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  "draft", "onboarding", "active", "waiting_client", "internal_review", "completed", "on_hold", "cancelled", "archived",
];
/** Statuses that count as "in delivery". */
export const ACTIVE_STATUSES: readonly ProjectStatus[] = ["onboarding", "active", "waiting_client", "internal_review"];
/** Statuses where deadlines/health no longer apply. */
export const CLOSED_STATUSES: readonly ProjectStatus[] = ["completed", "cancelled", "archived"];

export const PRIORITIES: readonly ProjectPriority[] = ["low", "normal", "high", "critical"];
export const PRIORITY_RANK: Record<ProjectPriority, number> = { critical: 0, high: 1, normal: 2, low: 3 };

/** Built-in project types; custom values are allowed (free text column). */
export const PROJECT_TYPES = ["website", "branding", "marketing", "creative_3d", "retainer", "other"] as const;

export const MEMBER_STATUSES: readonly ProjectMemberStatus[] = ["planned", "active", "completed", "removed"];
export const MILESTONE_STATUSES: readonly MilestoneStatus[] = ["not_started", "in_progress", "waiting", "completed", "blocked"];
export const TASK_STATUSES: readonly TaskStatus[] = ["todo", "in_progress", "blocked", "internal_review", "done"];
export const CHANGE_REQUEST_STATUSES: readonly ChangeRequestStatus[] = ["draft", "sent", "approved", "rejected"];
export const LINK_KINDS: readonly ProjectLinkKind[] = ["figma", "webflow", "drive", "client_docs", "staging", "production", "other"];
export const COST_CATEGORIES: readonly DirectCostCategory[] = ["external_specialist", "stock", "software", "printing", "photography", "subcontractor", "other"];
export const PROJECT_SORTS: readonly ProjectSort[] = ["deadline", "newest", "revenue", "margin", "priority", "name"];

/** Health rule parameters. */
export const HEALTH_RULES = {
  /** Days before the deadline at which unfinished work becomes a concern. */
  DEADLINE_SOON_DAYS: 7,
  /** Progress below this near the deadline triggers "attention". */
  DEADLINE_SOON_MIN_PROGRESS: 80,
  /** Forecast direct cost above baseline by this % → cost overrun. */
  COST_OVERRUN_PERCENT: 10,
  /** Overrun at/above this % → critical. */
  COST_OVERRUN_CRITICAL_PERCENT: 25,
  /** Project overdue by at least this many days → critical. */
  PROJECT_OVERDUE_CRITICAL_DAYS: 7,
  BLOCKED_TASKS_AT_RISK: 2,
} as const;

export const PROJECT_LIST_LIMIT = 300;
