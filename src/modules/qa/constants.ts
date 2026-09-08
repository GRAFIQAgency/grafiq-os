import type { QaChecklistStatus, QaItemStatus } from "./types";

export const CHECKLIST_STATUSES: readonly QaChecklistStatus[] = ["not_started", "in_progress", "needs_fixes", "ready_for_review", "approved"];
export const ITEM_STATUSES: readonly QaItemStatus[] = ["pending", "pass", "fail", "na", "blocked"];

/** Item states that count as "resolved" (the reviewer has looked at it). */
export const RESOLVED_ITEM_STATUSES: readonly QaItemStatus[] = ["pass", "fail", "na", "blocked"];

/**
 * Which seeded template a project type should start from. One mapping for the
 * whole app: the Project QA tab, the checklist form and the tests read it.
 * Keys are projects.project_type values; values are qa_templates.seed_key.
 */
export const TEMPLATE_SEED_BY_PROJECT_TYPE: Record<string, string> = {
  website: "website",
  branding: "branding",
  creative_3d: "creative_3d",
  marketing: "marketing",
  retainer: "generic",
  other: "generic",
};
export const FALLBACK_TEMPLATE_SEED = "generic";

/** Ordering of overview groups (most urgent first). */
export const ATTENTION_GROUP_ORDER = ["needs_attention", "ready_for_review", "in_progress", "not_started", "approved"] as const;

/** Prefix used for fix tasks created from failed QA items. */
export const FIX_TASK_PREFIX = "QA";

export const QA_LIST_LIMIT = 300;
