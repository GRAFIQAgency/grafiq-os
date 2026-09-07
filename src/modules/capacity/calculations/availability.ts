import { PLANNABLE_BENCH_STATUSES, WEEKS_PER_MONTH } from "../constants";
import type { CapacityPerson, Period } from "../types";
import { maxDate, monthPeriod, monthsCovering, overlap, workingDays } from "./periods";

/**
 * How many hours a person can work in a period.
 *
 * Source of the monthly number (decided when the person is loaded):
 *   Talent  → preferred monthly workload, else maximum monthly capacity
 *   Internal → preferred_monthly_hours, else monthly_capacity_hours
 *   none     → null ("capacity not configured") — never invented.
 *
 * Period conversion:
 *   month → the monthly number, prorated by working days when the person is
 *           available only from a date inside the month
 *   week  → monthly × 12/52, prorated the same way within the week
 *   range → sum over the months the range touches, each prorated by the
 *           working days of the range inside that month
 *
 * Availability rules (all make the person unavailable = 0 h):
 *   bench status not plannable (paused, unavailable, archived), Talent
 *   availability "unavailable", internal capacity switched off, or an
 *   available-from date after the period end.
 */

export function isPlannable(person: CapacityPerson): boolean {
  if (!person.capacityActive) return false;
  if (person.kind === "talent") {
    if (person.benchStatus && !PLANNABLE_BENCH_STATUSES.includes(person.benchStatus)) return false;
    if (person.availability === "unavailable") return false;
  }
  return true;
}

/** True when the person is unavailable for the whole period. */
export function isUnavailableInPeriod(person: CapacityPerson, period: Period): boolean {
  if (!isPlannable(person)) return true;
  if (person.availableFrom && person.availableFrom > period.end) return true;
  return false;
}

/** Fraction of the period's working days on which the person is available (0–1). */
function availableFraction(person: CapacityPerson, period: Period): number {
  const total = workingDays(period.start, period.end);
  if (total === 0) return 0;
  const from = person.availableFrom ? maxDate(person.availableFrom, period.start) : period.start;
  const inter = overlap(from, period.end, period.start, period.end);
  if (!inter) return 0;
  return workingDays(inter.start, inter.end) / total;
}

/** Capacity for one month or week period; null when not configured. */
export function periodCapacity(person: CapacityPerson, period: Period): number | null {
  if (person.monthlyCapacity == null) return null;
  if (isUnavailableInPeriod(person, period)) return 0;
  if (period.kind === "range") return rangeCapacity(person, period.start, period.end);
  const base = period.kind === "week" ? person.monthlyCapacity / WEEKS_PER_MONTH : person.monthlyCapacity;
  return round(base * availableFraction(person, period));
}

/** Capacity for an arbitrary inclusive range: month by month, prorated by working days. */
export function rangeCapacity(person: CapacityPerson, start: string, end: string): number | null {
  if (person.monthlyCapacity == null) return null;
  if (!isPlannable(person)) return 0;
  let total = 0;
  for (const month of monthsCovering(start, end)) {
    const monthDays = workingDays(month.start, month.end);
    if (monthDays === 0) continue;
    const from = person.availableFrom ? maxDate(person.availableFrom, start) : start;
    const inter = overlap(from, end, month.start, month.end);
    if (!inter) continue;
    total += (person.monthlyCapacity * workingDays(inter.start, inter.end)) / monthDays;
  }
  return round(total);
}

/** Month containing a date, exported for callers that need "this month" capacity. */
export function monthCapacity(person: CapacityPerson, anchor: string): number | null {
  return periodCapacity(person, monthPeriod(anchor));
}

export function round(n: number): number {
  return Math.round(n * 100) / 100;
}
