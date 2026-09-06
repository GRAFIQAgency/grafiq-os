import type { Currency } from "./types";

const LOCALE_BY_CURRENCY: Record<Currency, string> = {
  CZK: "cs-CZ",
  EUR: "de-DE",
  USD: "en-US",
};

export function formatMoney(value: number, currency: Currency): string {
  return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number | null, digits = 1): string {
  if (value === null) return "—";
  return `${value.toFixed(digits)} %`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso)
  );
}
