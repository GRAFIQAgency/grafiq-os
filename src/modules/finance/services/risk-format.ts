import { formatDate, formatMoney } from "@/lib/format";
import { INTL_LOCALES, type Locale } from "@/lib/i18n/config";

import type { FinanceRisk } from "../types";

/**
 * Turns a risk's raw params into display values (money, dates, months) for
 * `dict.finance.risks.<code>`. Shared by the Finance risk list and the
 * Dashboard attention feed so both read the same sentence.
 */
const MONEY = new Set(["ending", "outgoing", "incoming", "starting", "amount", "shortfall", "largest", "contract", "scheduled"]);
const DATES = new Set(["date", "asOf"]);

export function formatRiskParams(risk: FinanceRisk, locale: Locale): Record<string, string | number> {
  const monthFmt = new Intl.DateTimeFormat(INTL_LOCALES[locale], { month: "long", year: "numeric" });
  const out: Record<string, string | number> = { currency: risk.currency ?? "" };
  for (const [k, v] of Object.entries(risk.params)) {
    if (k === "month" && typeof v === "string") out[k] = monthFmt.format(new Date(`${v}-01T00:00:00Z`));
    else if (MONEY.has(k) && typeof v === "number") out[k] = formatMoney(v, risk.currency, locale);
    else if (DATES.has(k) && typeof v === "string") out[k] = formatDate(v, locale);
    else out[k] = v;
  }
  return out;
}
