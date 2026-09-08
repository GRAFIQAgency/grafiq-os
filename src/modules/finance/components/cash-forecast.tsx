import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { INTL_LOCALES } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

import { FORECAST_HORIZONS } from "../constants";
import type { CashForecast } from "../types";

/** Exact monthly numbers per currency plus a compact bar strip; horizon switch via links. */
export function CashForecastView({ forecasts, horizon, hrefBase, dict, locale }: { forecasts: CashForecast[]; horizon: number; hrefBase: string; dict: Dictionary; locale: Locale }) {
  const t = dict.finance.forecast;
  const monthFmt = new Intl.DateTimeFormat(INTL_LOCALES[locale], { month: "short", year: "2-digit" });
  const monthLong = new Intl.DateTimeFormat(INTL_LOCALES[locale], { month: "long", year: "numeric" });
  const label = (m: string) => monthFmt.format(new Date(`${m}-01T00:00:00Z`));
  return (
    <div className="space-y-6" data-guide="finance-forecast">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t.description}</p>
        <div className="flex items-center gap-1" data-guide="finance-horizon">
          <span className="mr-1 text-xs text-muted-foreground">{t.horizon}</span>
          {FORECAST_HORIZONS.map((h) => (
            <Link key={h} href={`${hrefBase}?months=${h}`} className={cn(buttonVariants({ size: "xs", variant: h === horizon ? "default" : "outline" }))}>{interpolate(t.months, { n: h })}</Link>
          ))}
        </div>
      </div>
      {forecasts.length === 0 ? <p className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">{t.empty}</p> : null}
      {forecasts.map((f) => {
        const money = (v: number) => formatMoney(v, f.currency, locale);
        const max = Math.max(1, ...f.months.flatMap((m) => [Math.abs(m.ending), m.inflows, m.outflows]));
        return (
          <section key={f.currency} className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold">{f.currency}</h3>
              <p className={cn("text-xs", f.runway.kind === "negative" ? "font-medium text-red-400" : "text-emerald-400")}>
                {f.runway.kind === "negative" ? interpolate(t.runwayNegative, { month: monthLong.format(new Date(`${f.runway.month}-01T00:00:00Z`)), amount: money(f.runway.ending) }) : interpolate(t.runwayPositive, { n: f.horizonMonths })}
              </p>
            </div>
            {f.startingUnknown ? <p className="text-xs text-amber-400">{interpolate(t.unknownStart, { currency: f.currency })}</p> : null}

            {/* Compact visual: in / out bars and the ending balance marker per month */}
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${f.months.length}, minmax(0, 1fr))` }} aria-hidden>
              {f.months.map((m) => (
                <div key={m.month} className="space-y-1">
                  <div className="flex h-16 items-end gap-0.5">
                    <div className="flex-1 rounded-sm bg-emerald-500/60" style={{ height: `${(m.inflows / max) * 100}%` }} title={`+${money(m.inflows)}`} />
                    <div className="flex-1 rounded-sm bg-muted-foreground/40" style={{ height: `${(m.outflows / max) * 100}%` }} title={`−${money(m.outflows)}`} />
                  </div>
                  <div className={cn("h-1 rounded-full", m.ending < 0 ? "bg-red-500" : "bg-foreground/60")} style={{ width: `${Math.min(100, (Math.abs(m.ending) / max) * 100)}%` }} />
                  <p className="truncate text-[10px] text-muted-foreground">{label(m.month)}</p>
                </div>
              ))}
            </div>

            {/* Exact numbers */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="[&>th]:py-1.5 [&>th]:text-right [&>th]:font-medium">
                    <th className="text-left!">{t.month}</th><th>{t.starting}</th><th>{t.receivables}</th><th>{t.payables}</th><th>{t.recurring}</th><th>{t.ending}</th>
                  </tr>
                </thead>
                <tbody>
                  {f.months.map((m) => (
                    <tr key={m.month} className="border-t border-border/60 [&>td]:py-1.5 [&>td]:text-right [&>td]:tabular-nums">
                      <td className="text-left! font-medium">{label(m.month)}</td>
                      <td className="text-muted-foreground">{money(m.starting)}</td>
                      <td className={m.receivables ? "text-emerald-400" : "text-muted-foreground"}>+{money(m.receivables)}</td>
                      <td className={m.payables ? "" : "text-muted-foreground"}>−{money(m.payables)}</td>
                      <td className={m.recurring ? "" : "text-muted-foreground"}>−{money(m.recurring)}</td>
                      <td className={cn("font-semibold", m.ending < 0 && "text-red-400")}>{money(m.ending)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
      <p className="text-xs text-muted-foreground">{t.rule}</p>
    </div>
  );
}
