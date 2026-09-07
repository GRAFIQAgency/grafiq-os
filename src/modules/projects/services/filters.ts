import { PRIORITIES, PROJECT_SORTS, PROJECT_STATUSES } from "../constants";
import type { ProjectFilters, ProjectSort } from "../types";

type Params = Record<string, string | string[] | undefined>;
const str = (p: Params, k: string) => {
  const v = p[k];
  const s = (Array.isArray(v) ? v[0] : v)?.trim();
  return s ? s : undefined;
};
const oneOf = <T extends string>(v: string | undefined, allowed: readonly T[]) => (allowed.includes(v as T) ? (v as T) : undefined);

export function parseProjectFilters(p: Params): ProjectFilters {
  const f: ProjectFilters = {
    q: str(p, "q"),
    status: oneOf(str(p, "status"), PROJECT_STATUSES),
    clientId: str(p, "client"),
    ownerId: str(p, "owner"),
    projectType: str(p, "type"),
    priority: oneOf(str(p, "priority"), PRIORITIES),
    health: oneOf(str(p, "health"), ["healthy", "attention", "at_risk", "critical"] as const),
    deadlineBefore: /^\d{4}-\d{2}-\d{2}$/.test(str(p, "deadlineBefore") ?? "") ? str(p, "deadlineBefore") : undefined,
    includeArchived: str(p, "archived") === "1" ? true : undefined,
  };
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) as ProjectFilters;
}

export function parseProjectSort(p: Params): ProjectSort {
  return oneOf(str(p, "sort"), PROJECT_SORTS) ?? "deadline";
}
