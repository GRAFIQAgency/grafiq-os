import { getModule } from "@/config/modules";

import type { Period } from "../types";
import { periodKey } from "../calculations/periods";

export type CapacityParams = Record<string, string | undefined>;

/** Builds a /capacity URL from the current params with overrides (undefined removes a key). */
export function capacityHref(current: CapacityParams, overrides: CapacityParams = {}, path = ""): string {
  const merged: CapacityParams = { ...current, ...overrides };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
  const qs = params.toString();
  return `${getModule("capacity").href}${path}${qs ? `?${qs}` : ""}`;
}

export function personHref(key: string, current: CapacityParams = {}): string {
  return capacityHref({ kind: current.kind, period: current.period }, {}, `/${encodeURIComponent(key)}`);
}

/** Params that identify the selected period (kept when switching views/filters). */
export function periodParams(period: Period): CapacityParams {
  return { kind: period.kind === "week" ? "week" : undefined, period: periodKey(period) };
}

/** Flattens Next's searchParams into a plain string map. */
export function flattenParams(p: Record<string, string | string[] | undefined>): CapacityParams {
  return Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
}
