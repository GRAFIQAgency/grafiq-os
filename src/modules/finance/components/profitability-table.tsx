import Link from "next/link";

import { FilterActions, FilterField, SelectFilter, TextFilter } from "@/components/shared/filter-form";
import { CURRENCIES } from "@/config/currencies";
import { getModule } from "@/config/modules";
import { formatMoney, formatPercent } from "@/lib/format";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";
import { PROJECT_STATUSES, PROJECT_TYPES } from "@/modules/projects/constants";
import { cn } from "@/lib/utils";

import type { PortfolioTotals, ProfitabilityFilters, ProjectProfitability } from "../types";

const HEALTH_TONE = { healthy: "text-emerald-400", attention: "text-amber-400", at_risk: "text-orange-400", critical: "text-red-400" } as const;

export function ProfitabilityFiltersForm({ filters, clients, action, dict }: { filters: ProfitabilityFilters; clients: { id: string; name: string }[]; action: string; dict: Dictionary }) {
  const t = dict.finance.profitability.filters;
  const s = dict.sourcing.search;
  const types = dict.projects.types as Record<string, string>;
  return (
    <form method="get" action={action} className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:flex-wrap md:items-end" data-guide="finance-profitability-filters">
      <FilterField label={dict.common.search} className="md:min-w-48 md:flex-1"><TextFilter name="q" defaultValue={filters.q} placeholder={t.search} /></FilterField>
      <FilterField label={t.scope} className="md:w-36"><SelectFilter name="scope" defaultValue={filters.scope ?? "active"} allowAny={false} anyLabel={s.any} options={(["active", "completed", "all"] as const).map((v) => ({ value: v, label: dict.finance.profitability.scopes[v] }))} /></FilterField>
      <FilterField label={t.status} className="md:w-40"><SelectFilter name="status" defaultValue={filters.status} anyLabel={s.any} options={PROJECT_STATUSES.map((v) => ({ value: v, label: dict.projects.statuses[v] }))} /></FilterField>
      <FilterField label={t.client} className="md:w-44"><SelectFilter name="client" defaultValue={filters.clientId} anyLabel={s.any} options={clients.map((c) => ({ value: c.id, label: c.name }))} /></FilterField>
      <FilterField label={t.type} className="md:w-36"><SelectFilter name="type" defaultValue={filters.projectType} anyLabel={s.any} options={PROJECT_TYPES.map((v) => ({ value: v, label: types[v] ?? v }))} /></FilterField>
      <FilterField label={t.currency} className="md:w-28"><SelectFilter name="currency" defaultValue={filters.currency} anyLabel={s.any} options={CURRENCIES.map((c) => ({ value: c, label: c }))} /></FilterField>
      <FilterField label={t.health} className="md:w-36"><SelectFilter name="health" defaultValue={filters.health} anyLabel={s.any} options={(["healthy", "attention", "at_risk", "critical"] as const).map((v) => ({ value: v, label: dict.projects.health[v] }))} /></FilterField>
      <FilterActions applyLabel={s.apply} clearLabel={s.clear} clearHref={action} />
    </form>
  );
}

/** Portfolio totals per currency (weighted margin) + one row per project with sold / current / forecast blocks. */
export function ProfitabilityTable({ items, totals, dict, locale }: { items: ProjectProfitability[]; totals: PortfolioTotals[]; dict: Dictionary; locale: Locale }) {
  const t = dict.finance.profitability;
  const c = t.columns;
  const projectsHref = getModule("projects").href;
  const financeHref = getModule("finance").href;
  const pct = (v: number | null) => formatPercent(v, locale, 1);

  return (
    <div className="space-y-6" data-guide="finance-profitability">
      <section className="space-y-2">
        <h3 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">{t.portfolio} <span className="font-normal normal-case tracking-normal">· {t.views.forecast}</span></h3>
        {totals.length === 0 ? <p className="text-sm text-muted-foreground">{t.empty}</p> : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {totals.map((x) => (
              <div key={x.currency} className="rounded-lg border bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground">{x.currency} · {interpolate(t.count, { n: x.projects })}</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">{c.revenue}</dt><dd className="text-right tabular-nums">{formatMoney(x.revenue, x.currency, locale)}</dd>
                  <dt className="text-muted-foreground">{c.cost}</dt><dd className="text-right tabular-nums">{formatMoney(x.directCost, x.currency, locale)}</dd>
                  <dt className="text-muted-foreground">{c.gp}</dt><dd className="text-right font-semibold tabular-nums">{formatMoney(x.grossProfit, x.currency, locale)}</dd>
                  <dt className="text-muted-foreground">{c.gm}</dt><dd className="text-right font-semibold tabular-nums">{pct(x.grossMargin)}</dd>
                </dl>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">{t.portfolioHint}</p>
      </section>

      {items.length === 0 ? null : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr className="[&>th]:px-2 [&>th]:py-1.5 [&>th]:text-center [&>th]:font-medium">
                  <th rowSpan={2} className="text-left!">{c.project}</th><th rowSpan={2} className="text-left!">{c.status}</th>
                  <th colSpan={4} className="border-l border-border/60">{t.sections.sold}</th><th colSpan={4} className="border-l border-border/60">{t.sections.current}</th><th colSpan={3} className="border-l border-border/60">{t.sections.forecast}</th>
                  <th rowSpan={2}>{c.health}</th>
                </tr>
                <tr className="[&>th]:px-2 [&>th]:py-1.5 [&>th]:text-right [&>th]:font-medium">
                  <th className="border-l border-border/60">{c.revenue}</th><th>{c.cost}</th><th>{c.gp}</th><th>{c.gm}</th>
                  <th className="border-l border-border/60">{c.contract}</th><th>{c.cost}</th><th>{c.gp}</th><th>{c.gm}</th>
                  <th className="border-l border-border/60">{c.cost}</th><th>{c.gp}</th><th>{c.gm}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => {
                  const f = p.financials;
                  const m = (v: number) => formatMoney(v, p.currency, locale);
                  return (
                    <tr key={p.projectId} className="border-t transition-colors hover:bg-muted/30 [&>td]:px-2 [&>td]:py-2 [&>td]:text-right [&>td]:tabular-nums">
                      <td className="text-left!">
                        <Link href={`${projectsHref}/${p.projectId}?tab=financials`} className="font-medium hover:underline">{p.name}</Link>
                        <p className="text-xs text-muted-foreground">{[p.clientName, p.currency].filter(Boolean).join(" · ")} · <Link href={`${financeHref}/projects/${p.projectId}`} className="hover:underline">{t.payments}</Link></p>
                      </td>
                      <td className="text-left! text-xs">{dict.projects.statuses[p.status]}</td>
                      <td className="border-l border-border/60">{m(f.baseline.revenue)}</td><td>{m(f.baseline.directCost)}</td><td>{m(f.baseline.grossProfit)}</td><td>{pct(f.baseline.grossMargin)}</td>
                      <td className="border-l border-border/60">{m(f.current.revenue)}</td><td>{m(f.current.directCost)}</td><td>{m(f.current.grossProfit)}</td><td>{pct(f.current.grossMargin)}</td>
                      <td className="border-l border-border/60">{m(f.forecast.directCost)}</td><td className="font-semibold">{m(f.forecast.grossProfit)}</td><td className="font-semibold">{pct(f.forecast.grossMargin)}</td>
                      <td className={cn("text-center! text-xs font-medium", HEALTH_TONE[p.marginHealth])}>{dict.projects.health[p.marginHealth]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile */}
          <div className="space-y-2 md:hidden">
            {items.map((p) => {
              const f = p.financials;
              const m = (v: number) => formatMoney(v, p.currency, locale);
              return (
                <Link key={p.projectId} href={`${projectsHref}/${p.projectId}?tab=financials`} className="block rounded-lg border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="line-clamp-1 font-medium">{p.name}</p><p className="line-clamp-1 text-xs text-muted-foreground">{[p.clientName, dict.projects.statuses[p.status], p.currency].filter(Boolean).join(" · ")}</p></div>
                    <span className={cn("text-xs font-medium", HEALTH_TONE[p.marginHealth])}>{dict.projects.health[p.marginHealth]}</span>
                  </div>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div><dt className="text-muted-foreground">{t.sections.sold}</dt><dd className="tabular-nums">{m(f.baseline.grossProfit)} · {pct(f.baseline.grossMargin)}</dd></div>
                    <div><dt className="text-muted-foreground">{t.sections.current}</dt><dd className="tabular-nums">{m(f.current.grossProfit)} · {pct(f.current.grossMargin)}</dd></div>
                    <div><dt className="text-muted-foreground">{t.sections.forecast}</dt><dd className="font-semibold tabular-nums">{m(f.forecast.grossProfit)} · {pct(f.forecast.grossMargin)}</dd></div>
                  </dl>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
