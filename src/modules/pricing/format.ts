import { INTL_LOCALES, type Locale } from "@/lib/i18n/config";

import type { Currency } from "./types";

export function formatMoney(value: number, currency: Currency, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALES[locale], {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number | null, locale: Locale, digits = 1): string {
  if (value === null) return "—";
  const formatted = new Intl.NumberFormat(INTL_LOCALES[locale], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
  return `${formatted} %`;
}

export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}
