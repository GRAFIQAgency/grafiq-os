import { CHECKLIST_STATUSES } from "../constants";
import type { QaFilters } from "../types";

type Params = Record<string, string | string[] | undefined>;

const str = (p: Params, k: string) => {
  const v = p[k];
  const s = (Array.isArray(v) ? v[0] : v)?.trim();
  return s ? s : undefined;
};

export function parseQaFilters(p: Params): QaFilters {
  const status = str(p, "status");
  const f: QaFilters = {
    q: str(p, "q"),
    status: CHECKLIST_STATUSES.find((s) => s === status),
    projectId: str(p, "project"),
    projectType: str(p, "type"),
    reviewerId: str(p, "reviewer"),
    failedOnly: str(p, "failed") === "1" ? true : undefined,
    awaitingReview: str(p, "review") === "1" ? true : undefined,
    approvedOnly: str(p, "approved") === "1" ? true : undefined,
    overdueOnly: str(p, "overdue") === "1" ? true : undefined,
  };
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) as QaFilters;
}
