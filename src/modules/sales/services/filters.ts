import { CRM_STAGES, DEAL_SORTS } from "../constants";
import type { DealFilters, DealSort, PipelineView } from "../types";

type Params = Record<string, string | string[] | undefined>;

const str = (p: Params, k: string) => {
  const v = p[k];
  const s = (Array.isArray(v) ? v[0] : v)?.trim();
  return s ? s : undefined;
};
const oneOf = <T extends string>(v: string | undefined, allowed: readonly T[]) => (allowed.includes(v as T) ? (v as T) : undefined);

export function parseDealFilters(p: Params): DealFilters {
  const f: DealFilters = {
    q: str(p, "q"),
    stage: oneOf(str(p, "stage"), CRM_STAGES),
    ownerId: str(p, "owner"),
    overdueOnly: str(p, "overdue") === "1" ? true : undefined,
    includeClosed: str(p, "closed") === "1" ? true : undefined,
    country: str(p, "country"),
    industry: str(p, "industry"),
  };
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) as DealFilters;
}

export function parseDealSort(p: Params): DealSort {
  return oneOf(str(p, "sort"), DEAL_SORTS) ?? "next_action";
}

export function parsePipelineView(p: Params): PipelineView {
  return str(p, "view") === "board" ? "board" : "list";
}
