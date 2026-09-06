/**
 * Filters ⇄ URL search params. Keeps list pages bookmarkable and lets
 * saved searches store exactly what the user had on screen.
 */
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../constants";
import type { CompanyFilters, ListParams, SortOrder, TalentFilters } from "../types";

type Params = Record<string, string | string[] | undefined>;

function str(p: Params, key: string): string | undefined {
  const v = p[key];
  const s = Array.isArray(v) ? v[0] : v;
  const trimmed = s?.trim();
  return trimmed ? trimmed : undefined;
}

function num(p: Params, key: string): number | undefined {
  const s = str(p, key);
  if (s === undefined) return undefined;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

function bool(p: Params, key: string): boolean | undefined {
  const s = str(p, key);
  if (s === "1" || s === "true") return true;
  if (s === "0" || s === "false") return false;
  return undefined;
}

export function list(p: Params, key: string): string[] | undefined {
  const s = str(p, key);
  if (!s) return undefined;
  const items = s.split(",").map((x) => x.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function compact<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

export function parseTalentFilters(p: Params): TalentFilters {
  return compact({
    q: str(p, "q"),
    role: str(p, "role"),
    skills: list(p, "skills"),
    technologies: list(p, "tech"),
    country: str(p, "country"),
    city: str(p, "city"),
    remote: bool(p, "remote"),
    seniority: oneOf(str(p, "seniority"), ["junior", "mid", "senior", "lead"] as const),
    employmentType: oneOf(str(p, "employment"), ["freelancer", "contractor", "employee"] as const),
    rateMin: num(p, "rateMin"),
    rateMax: num(p, "rateMax"),
    availability: oneOf(str(p, "availability"), ["available", "limited", "unavailable", "unknown"] as const),
    languages: list(p, "languages"),
    minYears: num(p, "minYears"),
    hasPortfolio: bool(p, "portfolio"),
    agencyExperience: bool(p, "agency"),
    status: oneOf(str(p, "status"), [
      "discovered", "reviewed", "shortlisted", "contacted", "interview",
      "trial", "approved", "preferred", "rejected", "archived",
    ] as const),
    minScore: num(p, "minScore"),
    tags: list(p, "tags"),
    inBench: bool(p, "bench"),
  });
}

export function parseCompanyFilters(p: Params): CompanyFilters {
  return compact({
    q: str(p, "q"),
    country: str(p, "country"),
    city: str(p, "city"),
    industry: str(p, "industry"),
    sizeBucket: oneOf(str(p, "size"), ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"] as const),
    employeesMin: num(p, "employeesMin"),
    employeesMax: num(p, "employeesMax"),
    technologies: list(p, "tech"),
    keywords: list(p, "keywords"),
    foundedAfter: num(p, "foundedAfter"),
    foundedBefore: num(p, "foundedBefore"),
    businessModel: oneOf(str(p, "model"), ["b2b", "b2c", "both"] as const),
    companyType: oneOf(str(p, "type"), [
      "saas", "ecommerce", "services", "agency", "manufacturing", "hospitality", "real_estate", "other",
    ] as const),
    language: str(p, "language"),
    signals: list(p, "signals"),
    status: oneOf(str(p, "status"), [
      "discovered", "reviewed", "shortlisted", "contacted", "qualified", "rejected", "archived",
    ] as const),
    minScore: num(p, "minScore"),
    tags: list(p, "tags"),
    inCrm: bool(p, "crm"),
  });
}

export function parseListParams(p: Params): ListParams {
  const page = Math.max(1, Math.floor(num(p, "page") ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(5, Math.floor(num(p, "pageSize") ?? DEFAULT_PAGE_SIZE)));
  const sort: SortOrder = str(p, "sort") === "score" ? "score" : "newest";
  return { page, pageSize, sort };
}

/** Serialises filters back to URL params (inverse of parse*). */
const TALENT_PARAM_KEYS: Record<keyof TalentFilters, string> = {
  q: "q", role: "role", skills: "skills", technologies: "tech", country: "country", city: "city",
  remote: "remote", seniority: "seniority", employmentType: "employment", rateMin: "rateMin",
  rateMax: "rateMax", availability: "availability", languages: "languages", minYears: "minYears",
  hasPortfolio: "portfolio", agencyExperience: "agency", status: "status", minScore: "minScore",
  tags: "tags", inBench: "bench",
};

const COMPANY_PARAM_KEYS: Record<keyof CompanyFilters, string> = {
  q: "q", country: "country", city: "city", industry: "industry", sizeBucket: "size",
  employeesMin: "employeesMin", employeesMax: "employeesMax", technologies: "tech", keywords: "keywords",
  foundedAfter: "foundedAfter", foundedBefore: "foundedBefore", businessModel: "model", companyType: "type",
  language: "language", signals: "signals", status: "status", minScore: "minScore", tags: "tags", inCrm: "crm",
};

function toParams(filters: Record<string, unknown>, keys: Record<string, string>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [field, value] of Object.entries(filters)) {
    const key = keys[field];
    if (!key || value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(","));
    } else if (typeof value === "boolean") {
      params.set(key, value ? "1" : "0");
    } else {
      params.set(key, String(value));
    }
  }
  return params;
}

export function talentFiltersToParams(filters: TalentFilters): URLSearchParams {
  return toParams(filters as Record<string, unknown>, TALENT_PARAM_KEYS);
}

export function companyFiltersToParams(filters: CompanyFilters): URLSearchParams {
  return toParams(filters as Record<string, unknown>, COMPANY_PARAM_KEYS);
}

/** Human-readable chips for a saved search. */
export function describeFilters(filters: Record<string, unknown>): string[] {
  return Object.entries(filters)
    .filter(([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`);
}
