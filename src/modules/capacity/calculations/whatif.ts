import { WHATIF_MAX_CANDIDATES } from "../constants";
import type { CapacityDataset, WhatIfCandidate, WhatIfInput, WhatIfResult } from "../types";
import { rangeCapacity } from "./availability";
import { healthFor, utilization } from "./health";
import { personLoad } from "./load";
import { rangePeriod } from "./periods";

/**
 * What-if simulation: "can this person / someone in this role take N more
 * hours between two dates?". Pure and side-effect free — it only reads the
 * dataset and returns numbers. Nothing is created or persisted.
 *
 * For each candidate:
 *   available  = capacity for the exact date range
 *   booked     = hours already placed in that range (same booking rules)
 *   forecast   = booked + requested hours
 *   overBy     = max(0, forecast − available)
 * Role searches list plannable people whose role contains the text,
 * ranked by remaining capacity (most free first).
 */
export function simulate(data: CapacityDataset, input: WhatIfInput): WhatIfResult {
  const period = rangePeriod(input.start, input.end);
  const roleKey = input.role?.trim().toLowerCase() ?? "";
  const people = input.personKey
    ? data.people.filter((p) => p.key === input.personKey)
    : data.people.filter((p) => roleKey && (p.role ?? "").toLowerCase().includes(roleKey));

  const candidates: WhatIfCandidate[] = people.map((person) => {
    const load = personLoad(person, data.assignments, period);
    const available = rangeCapacity(person, period.start, period.end);
    const forecast = Math.round((load.booked + input.hours) * 100) / 100;
    const remaining = available == null ? null : Math.round((available - load.booked) * 100) / 100;
    return {
      person, available, booked: load.booked, remaining, forecast,
      forecastUtilization: utilization(forecast, available),
      overBy: available == null ? 0 : Math.max(0, Math.round((forecast - available) * 100) / 100),
      health: healthFor(forecast, available),
    };
  });

  const ranked = input.personKey
    ? candidates
    : candidates
        .filter((c) => c.available != null && c.available > 0)
        .sort((a, b) => (b.remaining ?? 0) - (a.remaining ?? 0) || a.person.name.localeCompare(b.person.name))
        .slice(0, WHATIF_MAX_CANDIDATES);

  return { input, period, candidates: ranked };
}
