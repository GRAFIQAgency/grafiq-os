import { formatMoney, formatPercent } from "@/lib/format";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";

import { STALE_BALANCE_DAYS } from "../constants";
import type { CurrencyOverview } from "../types";
import { StatCard } from "./stat-card";

/** One block of cards per currency. Currencies are never combined. */
export function OverviewCards({ items, dict, locale }: { items: CurrencyOverview[]; dict: Dictionary; locale: Locale }) {
  const t = dict.finance.overview;
  return (
    <div className="space-y-6" data-guide="finance-cash">
      {items.map((o) => {
        const money = (v: number | null) => formatMoney(v, o.currency, locale);
        return (
          <section key={o.currency} className="space-y-2">
            <h3 className="flex items-baseline gap-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {o.currency}
              <span className="font-normal normal-case tracking-normal">{interpolate(t.activeProjects, { n: o.activeProjects })}</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label={t.cash} value={o.cash.unknown ? "—" : money(o.cash.available)} tone={o.cash.unknown ? "muted" : "default"}
                hint={o.cash.unknown ? t.cashUnknown : o.cash.stale ? <span className="text-amber-400">{interpolate(t.cashStale, { days: STALE_BALANCE_DAYS })}</span> : o.cash.adjustments ? interpolate(dict.finance.accounts.adjustments, { amount: money(o.cash.adjustments) }) : t.cashHint} />
              <StatCard label={t.expectedIn} value={`+${money(o.expectedIn30)}`} />
              <StatCard label={t.expectedOut} value={`−${money(o.expectedOut30)}`} />
              <StatCard label={t.net30} value={money(o.net30)} tone={o.net30 < 0 ? "risk" : "default"} />
              <StatCard label={t.overdueReceivables} value={money(o.overdueReceivables)} tone={o.overdueReceivables > 0 ? "risk" : "default"} hint={interpolate(t.itemsCount, { n: o.overdueReceivableCount })} />
              <StatCard label={t.unpaidPayables} value={money(o.unpaidPayables)} hint={interpolate(t.itemsCount, { n: o.unpaidPayableCount })} />
              <StatCard label={t.forecastGp} value={money(o.forecastGrossProfit)} />
              <StatCard label={t.forecastGm} value={formatPercent(o.forecastGrossMargin, locale, 1)} />
            </div>
          </section>
        );
      })}
    </div>
  );
}
