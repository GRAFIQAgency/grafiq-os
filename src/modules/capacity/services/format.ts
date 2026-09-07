import type { Dictionary, Locale } from "@/lib/i18n/config";
import { INTL_LOCALES } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";

import type { Period } from "../types";
import { parseDate, periodKey } from "../calculations/periods";

/** "September 2026" / "Week 38 · 14–20 Sep 2026" / "1 Oct – 31 Oct 2026". */
export function periodLabel(period: Period, dict: Dictionary, locale: Locale): string {
  const tag = INTL_LOCALES[locale];
  if (period.kind === "month") {
    const s = new Intl.DateTimeFormat(tag, { month: "long", year: "numeric", timeZone: "UTC" }).format(parseDate(period.start));
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  const range = new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).formatRange(parseDate(period.start), parseDate(period.end));
  if (period.kind === "week") return `${interpolate(dict.capacity.period.weekLabel, { n: Number(periodKey(period).split("-W")[1]) })} · ${range}`;
  return range;
}

/** Short month label for the matrix header: "Sep 26". */
export function shortMonthLabel(period: Period, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], { month: "short", year: "2-digit", timeZone: "UTC" }).format(parseDate(period.start));
}

export function hours(value: number | null | undefined, locale: Locale): string {
  if (value == null) return "—";
  return `${new Intl.NumberFormat(INTL_LOCALES[locale], { maximumFractionDigits: 1 }).format(value)} h`;
}

export function percent(value: number | null | undefined, locale: Locale): string {
  if (value == null) return "—";
  return `${new Intl.NumberFormat(INTL_LOCALES[locale], { maximumFractionDigits: 0 }).format(value)} %`;
}
