import type { CrmStage, DealSort } from "./types";

/** Pipeline order. The first five are open stages; customer / lost close the deal. */
export const CRM_STAGES: readonly CrmStage[] = ["prospect", "contacted", "qualified", "proposal", "negotiation", "customer", "lost"];
export const OPEN_STAGES: readonly CrmStage[] = ["prospect", "contacted", "qualified", "proposal", "negotiation"];
export const CLOSED_STAGES: readonly CrmStage[] = ["customer", "lost"];

/** Default win probability per stage (percent). A deal can override it. */
export const STAGE_PROBABILITY: Record<CrmStage, number> = {
  prospect: 10,
  contacted: 20,
  qualified: 40,
  proposal: 60,
  negotiation: 80,
  customer: 100,
  lost: 0,
};

export const DEAL_SORTS: readonly DealSort[] = ["next_action", "value", "weighted", "expected_close", "score", "name", "recent"];

/** Upper bound of companies loaded for the pipeline (filtered/sorted in memory; the pipeline stays small). */
export const PIPELINE_LIST_LIMIT = 500;

/** Open deals without activity for this long are hinted as stale. */
export const STALE_AFTER_DAYS = 30;
