import { DEFAULT_MATRIX_HORIZON, MATRIX_HORIZONS } from "../constants";
import type { CapacityFilters, CapacityView, WhatIfInput } from "../types";

type Params = Record<string, string | string[] | undefined>;

const str = (p: Params, k: string) => {
  const v = p[k];
  const s = (Array.isArray(v) ? v[0] : v)?.trim();
  return s ? s : undefined;
};
const oneOf = <T extends string>(v: string | undefined, allowed: readonly T[]) => (allowed.includes(v as T) ? (v as T) : undefined);
const isDate = (s: string | undefined): s is string => Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)));

export function parseCapacityFilters(p: Params): CapacityFilters {
  const f: CapacityFilters = {
    q: str(p, "q"),
    role: str(p, "role"),
    kind: oneOf(str(p, "kind"), ["talent", "user"] as const),
    availability: oneOf(str(p, "availability"), ["available", "limited", "unavailable", "unknown"] as const),
    overloadedOnly: str(p, "overloaded") === "1" ? true : undefined,
    freeOnly: str(p, "free") === "1" ? true : undefined,
    projectId: str(p, "project"),
  };
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) as CapacityFilters;
}

export function parsePeriodKind(p: Params): "month" | "week" {
  return str(p, "kind") === "week" ? "week" : "month";
}

export function parseView(p: Params): CapacityView {
  return str(p, "view") === "projects" ? "projects" : "people";
}

export function parseHorizon(p: Params): number {
  const n = Number(str(p, "horizon"));
  return (MATRIX_HORIZONS as readonly number[]).includes(n) ? n : DEFAULT_MATRIX_HORIZON;
}

/** What-if params; null when the form has not been submitted or is incomplete. */
export function parseWhatIf(p: Params): WhatIfInput | null {
  const hours = Number(str(p, "wiHours")?.replace(",", "."));
  const start = str(p, "wiFrom");
  const end = str(p, "wiTo");
  const personKey = str(p, "wiPerson");
  const role = str(p, "wiRole");
  if (!Number.isFinite(hours) || hours <= 0 || !isDate(start) || !isDate(end)) return null;
  if (!personKey && !role) return null;
  return { personKey: personKey || undefined, role: personKey ? undefined : role, hours, start, end };
}
