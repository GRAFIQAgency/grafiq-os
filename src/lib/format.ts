import type { Currency } from "@/types/database";

import { INTL_LOCALES, type Locale } from "./i18n/config";

/** Locale-aware formatting shared by modules (Pricing keeps its own thin wrappers for now). */
export function formatMoney(value: number | null | undefined, currency: Currency | null | undefined, locale: Locale, digits = 0): string {
  if (value == null) return "—";
  if (!currency) return new Intl.NumberFormat(INTL_LOCALES[locale], { maximumFractionDigits: digits }).format(value);
  return new Intl.NumberFormat(INTL_LOCALES[locale], { style: "currency", currency, maximumFractionDigits: digits }).format(value);
}

export function formatPercent(value: number | null | undefined, locale: Locale, digits = 1): string {
  if (value == null) return "—";
  return `${new Intl.NumberFormat(INTL_LOCALES[locale], { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)} %`;
}

export function formatDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export function formatHours(value: number | null | undefined, locale: Locale): string {
  if (value == null) return "—";
  return `${new Intl.NumberFormat(INTL_LOCALES[locale], { maximumFractionDigits: 1 }).format(value)} h`;
}
