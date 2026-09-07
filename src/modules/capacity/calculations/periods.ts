import type { Period } from "../types";

/**
 * Date helpers on YYYY-MM-DD strings. Everything is calendar-day based and
 * timezone-free: a date string is treated as a plain day, never as an instant.
 * Working days = Monday–Friday (no holiday calendar in v1).
 */

const DAY_MS = 86_400_000;

export function toDateString(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

export function addDays(s: string, days: number): string {
  return toDateString(new Date(parseDate(s).getTime() + days * DAY_MS));
}

export function isWorkingDay(s: string): boolean {
  const dow = parseDate(s).getUTCDay(); // 0 = Sunday
  return dow >= 1 && dow <= 5;
}

/** Number of Monday–Friday days in an inclusive range; 0 when end < start. */
export function workingDays(start: string, end: string): number {
  const a = parseDate(start).getTime();
  const b = parseDate(end).getTime();
  if (b < a) return 0;
  let count = 0;
  for (let t = a; t <= b; t += DAY_MS) {
    const dow = new Date(t).getUTCDay();
    if (dow >= 1 && dow <= 5) count += 1;
  }
  return count;
}

export const maxDate = (a: string, b: string) => (a > b ? a : b);
export const minDate = (a: string, b: string) => (a < b ? a : b);

/** Intersection of two inclusive ranges, or null. */
export function overlap(aStart: string, aEnd: string, bStart: string, bEnd: string): { start: string; end: string } | null {
  const start = maxDate(aStart, bStart);
  const end = minDate(aEnd, bEnd);
  return start <= end ? { start, end } : null;
}

export function monthPeriod(anchor: string): Period {
  const d = parseDate(anchor);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return { kind: "month", start: toDateString(start), end: toDateString(end) };
}

/** ISO week: Monday to Sunday. */
export function weekPeriod(anchor: string): Period {
  const d = parseDate(anchor);
  const dow = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  const start = new Date(d.getTime() - (dow - 1) * DAY_MS);
  const end = new Date(start.getTime() + 6 * DAY_MS);
  return { kind: "week", start: toDateString(start), end: toDateString(end) };
}

export function rangePeriod(start: string, end: string): Period {
  return { kind: "range", start: minDate(start, end), end: maxDate(start, end) };
}

export function periodFor(kind: "month" | "week", anchor: string): Period {
  return kind === "week" ? weekPeriod(anchor) : monthPeriod(anchor);
}

/** Previous / next period of the same kind. */
export function shiftPeriod(period: Period, delta: number): Period {
  if (period.kind === "week") return weekPeriod(addDays(period.start, 7 * delta));
  if (period.kind === "month") {
    const d = parseDate(period.start);
    return monthPeriod(toDateString(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1))));
  }
  const days = Math.round((parseDate(period.end).getTime() - parseDate(period.start).getTime()) / DAY_MS) + 1;
  return rangePeriod(addDays(period.start, days * delta), addDays(period.end, days * delta));
}

/** `YYYY-MM` for months, `YYYY-Www` for weeks (URL param). */
export function periodKey(period: Period): string {
  if (period.kind === "month") return period.start.slice(0, 7);
  if (period.kind === "week") {
    // ISO week number of the Thursday in this week.
    const thu = parseDate(addDays(period.start, 3));
    const jan1 = new Date(Date.UTC(thu.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((thu.getTime() - jan1.getTime()) / DAY_MS + 1) / 7);
    return `${thu.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }
  return `${period.start}_${period.end}`;
}

/** Parses a period key; falls back to the period containing `today`. */
export function parsePeriodKey(key: string | undefined, kind: "month" | "week", today: string): Period {
  if (key && kind === "month" && /^\d{4}-\d{2}$/.test(key)) return monthPeriod(`${key}-01`);
  if (key && kind === "week") {
    const m = /^(\d{4})-W(\d{2})$/.exec(key);
    if (m) {
      // ISO week 1 contains 4 January.
      const jan4 = `${m[1]}-01-04`;
      const week1 = weekPeriod(jan4);
      return weekPeriod(addDays(week1.start, (Number(m[2]) - 1) * 7));
    }
  }
  return periodFor(kind, today);
}

/** The months (as periods) starting at the month containing `from`. */
export function monthsAhead(from: string, count: number): Period[] {
  const first = monthPeriod(from);
  return Array.from({ length: count }, (_, i) => shiftPeriod(first, i));
}

/** Months intersecting an inclusive range (for range capacity). */
export function monthsCovering(start: string, end: string): Period[] {
  const out: Period[] = [];
  let m = monthPeriod(start);
  while (m.start <= end) {
    out.push(m);
    m = shiftPeriod(m, 1);
  }
  return out;
}

/**
 * Proportional split: the share of `hours` (spread evenly over the working
 * days of [rangeStart, rangeEnd]) that falls inside `period`.
 * A range without working days (e.g. a single Saturday) is treated as one
 * unit on its start day so hours are never silently lost.
 */
export function distributeHours(hours: number, rangeStart: string, rangeEnd: string, period: Period): number {
  if (hours <= 0) return 0;
  const start = minDate(rangeStart, rangeEnd);
  const end = maxDate(rangeStart, rangeEnd);
  const total = workingDays(start, end);
  if (total === 0) return start >= period.start && start <= period.end ? hours : 0;
  const inter = overlap(start, end, period.start, period.end);
  if (!inter) return 0;
  return (hours * workingDays(inter.start, inter.end)) / total;
}
