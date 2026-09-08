/** Small pure date helpers on ISO "YYYY-MM-DD" strings (UTC, no time zones). */

const MS_DAY = 86_400_000;

export function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isoToday(now: Date = new Date()): string {
  return toIso(now);
}

function parse(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(iso: string, days: number): string {
  return toIso(new Date(parse(iso).getTime() + days * MS_DAY));
}

/** b − a in whole days (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / MS_DAY);
}

/** Adds months keeping the day where possible (31 Jan + 1 → 28/29 Feb). */
export function addMonths(iso: string, months: number): string {
  const d = parse(iso);
  const day = d.getUTCDate();
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day, lastDay));
  return toIso(first);
}

/** "YYYY-MM" of a date. */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function monthStart(key: string): string {
  return `${key}-01`;
}

export function monthEnd(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return toIso(new Date(Date.UTC(y, m, 0)));
}

/** Consecutive month keys starting with the month of `from`. */
export function monthKeys(from: string, count: number): string[] {
  const start = monthStart(monthKey(from));
  return Array.from({ length: count }, (_, i) => monthKey(addMonths(start, i)));
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
