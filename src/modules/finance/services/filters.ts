import { CURRENCIES } from "@/config/currencies";
import { PROJECT_STATUSES } from "@/modules/projects/constants";
import type { ProjectHealth } from "@/modules/projects/types";

import { PAYABLE_STATUSES, RECEIVABLE_STATUSES } from "../constants";
import type { ItemFilters, ProfitabilityFilters } from "../types";

type Params = Record<string, string | string[] | undefined>;

const str = (p: Params, k: string) => {
  const v = p[k];
  const s = (Array.isArray(v) ? v[0] : v)?.trim();
  return s ? s : undefined;
};
const compact = <T extends object>(f: T): T => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) as T;

export function parseItemFilters(p: Params, kind: "receivable" | "payable"): ItemFilters {
  const status = str(p, "status");
  const known = kind === "receivable" ? RECEIVABLE_STATUSES : PAYABLE_STATUSES;
  return compact<ItemFilters>({
    q: str(p, "q"), projectId: str(p, "project"), clientId: str(p, "client"), currency: CURRENCIES.find((c) => c === str(p, "currency")),
    status: known.find((s) => s === status), dueBefore: str(p, "due"), category: str(p, "category"),
  });
}

const HEALTHS: ProjectHealth[] = ["healthy", "attention", "at_risk", "critical"];

export function parseProfitabilityFilters(p: Params): ProfitabilityFilters {
  const scope = str(p, "scope");
  return compact<ProfitabilityFilters>({
    q: str(p, "q"), status: PROJECT_STATUSES.find((s) => s === str(p, "status")), clientId: str(p, "client"), projectType: str(p, "type"),
    currency: CURRENCIES.find((c) => c === str(p, "currency")), health: HEALTHS.find((h) => h === str(p, "health")),
    scope: scope === "completed" || scope === "all" ? scope : undefined,
  });
}
