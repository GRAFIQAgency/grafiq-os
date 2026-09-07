import { BENCH_STATUSES, ENGAGEMENT_TYPES, TALENT_SORTS } from "../constants";
import type { TalentFilters, TalentSort } from "../types";

type Params = Record<string, string | string[] | undefined>;

const str = (p: Params, k: string) => {
  const v = p[k];
  const s = (Array.isArray(v) ? v[0] : v)?.trim();
  return s ? s : undefined;
};
const num = (p: Params, k: string) => {
  const s = str(p, k);
  if (s === undefined) return undefined;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};
const oneOf = <T extends string>(v: string | undefined, allowed: readonly T[]) => (allowed.includes(v as T) ? (v as T) : undefined);

export function parseTalentFilters(p: Params): TalentFilters {
  const f: TalentFilters = {
    q: str(p, "q"),
    role: str(p, "role"),
    skills: str(p, "skills")?.split(",").map((s) => s.trim()).filter(Boolean),
    seniority: oneOf(str(p, "seniority"), ["junior", "mid", "senior", "lead"] as const),
    country: str(p, "country"),
    availability: oneOf(str(p, "availability"), ["available", "limited", "unavailable", "unknown"] as const),
    engagementType: oneOf(str(p, "engagement"), ENGAGEMENT_TYPES),
    preferredOnly: str(p, "preferred") === "1" ? true : undefined,
    status: oneOf(str(p, "status"), BENCH_STATUSES),
    rateMin: num(p, "rateMin"),
    rateMax: num(p, "rateMax"),
  };
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && !(Array.isArray(v) && !v.length))) as TalentFilters;
}

export function parseTalentSort(p: Params): TalentSort {
  return oneOf(str(p, "sort"), TALENT_SORTS) ?? "quality";
}
