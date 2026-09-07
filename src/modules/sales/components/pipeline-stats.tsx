import type { Dictionary, Locale } from "@/lib/i18n/config";
import { formatMoney } from "@/lib/format";
import type { Currency } from "@/types/database";

import type { PipelineStats } from "../types";

function moneyList(map: Partial<Record<Currency, number>>, locale: Locale): string {
  const parts = Object.entries(map).filter(([, v]) => v != null).map(([c, v]) => formatMoney(v, c as Currency, locale));
  return parts.length ? parts.join(" · ") : "—";
}

export function PipelineStatsStrip({ stats, dict, locale }: { stats: PipelineStats; dict: Dictionary; locale: Locale }) {
  const t = dict.sales.stats;
  const items = [
    { label: t.openDeals, value: String(stats.openDeals), hint: t.openDealsHint },
    { label: t.openValue, value: moneyList(stats.openValue, locale), hint: t.openValueHint },
    { label: t.weighted, value: moneyList(stats.weightedValue, locale), hint: t.weightedHint },
    { label: t.overdue, value: String(stats.overdueActions), hint: t.overdueHint, warn: stats.overdueActions > 0 },
    { label: t.wonLost, value: `${stats.wonThisMonth} / ${stats.lostThisMonth}`, hint: t.wonLostHint },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5" data-guide="sales-stats">
      {items.map((i) => (
        <div key={i.label} className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">{i.label}</p>
          <p className={`mt-1 text-lg font-semibold tabular-nums ${i.warn ? "text-amber-400" : ""}`}>{i.value}</p>
          <p className="text-[11px] text-muted-foreground/80">{i.hint}</p>
        </div>
      ))}
    </div>
  );
}
