import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";
import { CRM_STAGES } from "@/modules/sales/constants";
import type { CapacityOverview } from "@/modules/capacity/types";
import type { PipelineStats } from "@/modules/sales/types";
import type { QaAttentionItem, QaStats } from "@/modules/qa/types";
import type { Currency } from "@/types/database";
import { cn } from "@/lib/utils";

import type { DashboardFinance, DashboardProjects, Loaded } from "../types";
import { DashboardCard, Metric } from "./card-shell";

const HEALTH_TONE: Record<string, string> = { healthy: "text-emerald-400", attention: "text-amber-400", at_risk: "text-orange-400", critical: "text-red-400" };

function MoneyList({ values, locale, empty }: { values: [string, number][]; locale: Locale; empty: string }) {
  if (!values.length) return <span className="text-sm text-muted-foreground">{empty}</span>;
  return <span className="flex flex-col">{values.map(([c, v]) => <span key={c}>{formatMoney(v, c as Currency, locale)}</span>)}</span>;
}

// ---------------------------------------------------------------------------
// Sales
// ---------------------------------------------------------------------------
export function SalesCard({ loaded, overdueCount, href, dict, locale }: { loaded: Loaded<PipelineStats>; overdueCount: number; href: string; dict: Dictionary; locale: Locale }) {
  const t = dict.dashboard.sales;
  return (
    <DashboardCard title={t.title} loaded={loaded} dict={dict} href={href} linkLabel={t.openModule} empty={t.empty} emptyHint={t.emptyHint} anchor="dashboard-sales">
      {(s) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label={t.openDeals} value={s.openDeals} />
            <Metric label={t.pipelineValue} value={<MoneyList values={Object.entries(s.openValue)} locale={locale} empty="—" />} hint={`${t.weighted}: ${Object.entries(s.weightedValue).map(([c, v]) => formatMoney(v, c as Currency, locale)).join(" · ") || "—"}`} />
            <Metric label={t.overdueActions} value={overdueCount || s.overdueActions} tone={(overdueCount || s.overdueActions) > 0 ? "risk" : "default"} />
            <Metric label={t.wonThisMonth} value={s.wonThisMonth} hint={`${t.lostThisMonth}: ${s.lostThisMonth}`} tone={s.wonThisMonth > 0 ? "positive" : "default"} />
          </div>
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">{t.stages}</p>
            <ul className="space-y-1">
              {CRM_STAGES.filter((stage) => stage !== "customer" && stage !== "lost").map((stage) => {
                const n = s.byStage[stage] ?? 0;
                const max = Math.max(1, ...CRM_STAGES.map((x) => s.byStage[x] ?? 0));
                return (
                  <li key={stage} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 text-muted-foreground">{dict.sales.stages[stage]}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-foreground/50" style={{ width: `${(n / max) * 100}%` }} /></span>
                    <span className="w-6 text-right tabular-nums">{n}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------
export function ProjectsCard({ loaded, href, projectHref, dict, locale }: { loaded: Loaded<DashboardProjects>; href: string; projectHref: (id: string) => string; dict: Dictionary; locale: Locale }) {
  const t = dict.dashboard.projects;
  return (
    <DashboardCard title={t.title} loaded={loaded} dict={dict} href={href} linkLabel={t.openModule} empty={t.empty} emptyHint={t.emptyHint} anchor="dashboard-projects">
      {(p) => (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            <Metric label={t.active} value={p.active} />
            <Metric label={t.atRisk} value={p.atRisk} tone={p.atRisk > 0 ? "risk" : "default"} />
            <Metric label={t.dueThisWeek} value={p.dueThisWeek} />
            <Metric label={t.waitingClient} value={p.waitingClient} />
            <Metric label={t.internalReview} value={p.internalReview} />
            <Metric label={t.completedThisMonth} value={p.completedThisMonth} tone="positive" />
          </div>
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">{t.needAttention}</p>
            {p.attention.length === 0 ? <p className="text-sm text-emerald-400">{t.allHealthy}</p> : (
              <>
                <table className="hidden w-full text-sm md:table">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="[&>th]:py-1 [&>th]:text-left [&>th]:font-medium">
                      <th>{t.columns.project}</th><th>{t.columns.deadline}</th><th className="w-28">{t.columns.progress}</th><th className="text-right!">{t.columns.margin}</th><th className="text-right!">{t.columns.health}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.attention.map((x) => (
                      <tr key={x.id} className="border-t border-border/60">
                        <td className="py-1.5">
                          <Link href={projectHref(x.id)} className="font-medium hover:underline">{x.name}</Link>
                          <span className="block text-[11px] text-muted-foreground">{x.clientName ?? "—"}</span>
                        </td>
                        <td className="py-1.5 text-xs text-muted-foreground">{formatDate(x.deadline, locale)}</td>
                        <td className="py-1.5">
                          <span className="flex items-center gap-2">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-foreground/50" style={{ width: `${x.progress.percent}%` }} /></span>
                            <span className="text-xs tabular-nums">{x.progress.percent} %</span>
                          </span>
                        </td>
                        <td className="py-1.5 text-right text-xs tabular-nums">{formatPercent(x.forecastMargin, locale, 1)}</td>
                        <td className={cn("py-1.5 text-right text-xs font-medium", HEALTH_TONE[x.health])}>{dict.projects.health[x.health]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ul className="space-y-2 md:hidden">
                  {p.attention.map((x) => (
                    <li key={x.id}>
                      <Link href={projectHref(x.id)} className="block rounded-md border px-3 py-2">
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0"><span className="line-clamp-1 text-sm font-medium">{x.name}</span><span className="line-clamp-1 text-[11px] text-muted-foreground">{[x.clientName, formatDate(x.deadline, locale)].filter(Boolean).join(" · ")}</span></span>
                          <span className={cn("shrink-0 text-xs font-medium", HEALTH_TONE[x.health])}>{dict.projects.health[x.health]}</span>
                        </span>
                        <span className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-foreground/50" style={{ width: `${x.progress.percent}%` }} /></span>
                          <span className="tabular-nums">{x.progress.percent} %</span>
                          <span className="tabular-nums">{formatPercent(x.forecastMargin, locale, 0)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}

// ---------------------------------------------------------------------------
// Profitability (numbers from Finance's weighted portfolio)
// ---------------------------------------------------------------------------
export function ProfitabilityCard({ loaded, href, projectFinancialsHref, dict, locale }: { loaded: Loaded<DashboardFinance>; href: string; projectFinancialsHref: (id: string) => string; dict: Dictionary; locale: Locale }) {
  const t = dict.dashboard.profitability;
  return (
    <DashboardCard title={t.title} loaded={loaded} dict={dict} href={href} linkLabel={t.openModule} empty={dict.dashboard.finance.empty} emptyHint={dict.dashboard.finance.emptyHint} anchor="dashboard-profitability">
      {(f) => (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
          {f.portfolio.length === 0 ? <p className="text-sm text-muted-foreground">{t.empty}</p> : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {f.portfolio.map((x) => (
                <div key={x.currency} className="rounded-lg border px-4 py-3">
                  <p className="text-xs text-muted-foreground">{x.currency}</p>
                  <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">{t.revenue}</dt><dd className="text-right tabular-nums">{formatMoney(x.revenue, x.currency, locale)}</dd>
                    <dt className="text-muted-foreground">{t.cost}</dt><dd className="text-right tabular-nums">{formatMoney(x.directCost, x.currency, locale)}</dd>
                    <dt className="text-muted-foreground">{t.grossProfit}</dt><dd className="text-right font-semibold tabular-nums">{formatMoney(x.grossProfit, x.currency, locale)}</dd>
                    <dt className="text-muted-foreground">{t.margin}</dt><dd className="text-right font-semibold tabular-nums">{formatPercent(x.grossMargin, locale, 1)}</dd>
                  </dl>
                </div>
              ))}
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">{t.lowMargin} · {t.lowMarginHint}</p>
            {f.lowMargin.length === 0 ? <p className="mt-1 text-sm text-emerald-400">{t.noLowMargin}</p> : (
              <ul className="mt-1.5 divide-y divide-border/60">
                {f.lowMargin.map((p) => (
                  <li key={p.projectId} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                    <Link href={projectFinancialsHref(p.projectId)} className="min-w-0 hover:underline">
                      <span className="line-clamp-1">{p.name}</span>
                      <span className="line-clamp-1 text-[11px] text-muted-foreground">{p.clientName ?? "—"}</span>
                    </Link>
                    <span className={cn("shrink-0 font-semibold tabular-nums", HEALTH_TONE[p.health])}>{formatPercent(p.margin, locale, 1)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}

// ---------------------------------------------------------------------------
// Capacity
// ---------------------------------------------------------------------------
export function CapacityCard({ loaded, href, talentHref, personHref, dict, locale }: { loaded: Loaded<CapacityOverview>; href: string; talentHref: string; personHref: (key: string) => string; dict: Dictionary; locale: Locale }) {
  const t = dict.dashboard.capacity;
  return (
    <DashboardCard title={t.title} loaded={loaded} dict={dict} href={href} linkLabel={t.openModule} empty={t.empty} emptyHint={t.emptyHint} anchor="dashboard-capacity">
      {(c) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label={t.utilization} value={c.utilization == null ? dict.dashboard.unknown : formatPercent(c.utilization, locale, 0)} tone={c.overloadedPeople > 0 ? "risk" : "default"} />
            <Metric label={t.free} value={`${Math.round(c.remainingHours)} h`} />
            <Metric label={t.overloaded} value={c.overloadedPeople} tone={c.overloadedPeople > 0 ? "risk" : "default"} />
            <Metric label={t.unscheduled} value={`${Math.round(c.unscheduledHours)} h`} tone={c.unscheduledHours > 0 ? "muted" : "default"} />
          </div>
          {c.overloaded.length ? (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">{t.overloadedPeople}</p>
              <ul className="space-y-1">
                {c.overloaded.map((p) => (
                  <li key={p.personKey}>
                    <Link href={personHref(p.personKey)} className="flex items-baseline justify-between gap-3 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted/40">
                      <span className="min-w-0"><span className="line-clamp-1">{p.name}</span><span className="text-[11px] text-muted-foreground">{p.role ?? "—"}</span></span>
                      <span className="shrink-0 text-xs tabular-nums text-red-400">{p.utilization == null ? "" : `${Math.round(p.utilization)} % · `}{interpolate(t.hoursOver, { hours: Math.round(p.overBy) })}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <p className="mb-1 text-xs text-muted-foreground">{t.whoCanTakeWork}</p>
            {c.mostFree.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : (
              <ul className="space-y-1">
                {c.mostFree.slice(0, 3).map((p) => (
                  <li key={p.personKey}>
                    <Link href={personHref(p.personKey)} className="flex items-baseline justify-between gap-3 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted/40">
                      <span className="min-w-0"><span className="line-clamp-1">{p.name}</span><span className="text-[11px] text-muted-foreground">{p.role ?? "—"}</span></span>
                      <span className="shrink-0 text-xs tabular-nums text-emerald-400">{p.utilization == null ? "" : `${Math.round(p.utilization)} % · `}{interpolate(t.hoursFree, { hours: Math.round(p.remaining) })}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href={talentHref} className={cn(buttonVariants({ size: "xs", variant: "ghost" }), "mt-1")}>{t.openTalent}</Link>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}

// ---------------------------------------------------------------------------
// QA
// ---------------------------------------------------------------------------
export function QaCard({ loaded, items, href, checklistHref, dict }: { loaded: Loaded<QaStats>; items: QaAttentionItem[]; href: string; checklistHref: (id: string) => string; dict: Dictionary }) {
  const t = dict.dashboard.qa;
  return (
    <DashboardCard title={t.title} loaded={loaded} dict={dict} href={href} linkLabel={t.openModule} empty={t.empty} emptyHint={t.emptyHint} anchor="dashboard-qa">
      {(q) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label={t.needsFixes} value={q.needsFixes} tone={q.needsFixes > 0 ? "risk" : "default"} />
            <Metric label={t.readyForReview} value={q.readyForReview} />
            <Metric label={t.overdue} value={q.overdue} tone={q.overdue > 0 ? "risk" : "default"} />
            <Metric label={t.approvedThisMonth} value={q.approvedThisMonth} tone="positive" />
          </div>
          {items.length ? (
            <ul className="divide-y divide-border/60">
              {items.slice(0, 4).map((i) => (
                <li key={`${i.checklistId}-${i.reason}`}>
                  <Link href={checklistHref(i.checklistId)} className="flex items-baseline justify-between gap-3 py-1.5 text-sm hover:underline">
                    <span className="min-w-0"><span className="line-clamp-1">{i.projectName}</span><span className="line-clamp-1 text-[11px] text-muted-foreground">{i.title}</span></span>
                    <span className={cn("shrink-0 text-xs whitespace-nowrap", i.reason === "ready_for_review" ? "text-violet-400" : "text-red-400")}>
                      {i.reason === "failed" ? interpolate(dict.qa.overview.failed, { n: i.count }) : i.reason === "blocked" ? interpolate(dict.qa.overview.blocked, { n: i.count }) : i.reason === "overdue" ? dict.qa.overview.overdue : dict.qa.statuses.ready_for_review}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </DashboardCard>
  );
}

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------
export function FinanceCard({ loaded, href, cashflowHref, dict, locale }: { loaded: Loaded<DashboardFinance>; href: string; cashflowHref: string; dict: Dictionary; locale: Locale }) {
  const t = dict.dashboard.finance;
  const monthFmt = new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : "en-GB", { month: "short" });
  return (
    <DashboardCard title={t.title} loaded={loaded} dict={dict} href={href} linkLabel={t.openModule} empty={t.empty} emptyHint={t.emptyHint} anchor="dashboard-finance">
      {(f) => (
        <div className="space-y-5">
          {f.currencies.map((c) => (
            <section key={c.currency} className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">{c.currency}</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Metric label={t.cash} value={c.cash.unknown ? dict.dashboard.unknown : formatMoney(c.cash.available, c.currency, locale)} tone={c.cash.unknown ? "muted" : "default"} />
                <Metric label={t.expectedIn} value={`+${formatMoney(c.expectedIn30, c.currency, locale)}`} />
                <Metric label={t.expectedOut} value={`−${formatMoney(c.expectedOut30, c.currency, locale)}`} />
                <Metric label={t.overdue} value={formatMoney(c.overdueReceivables, c.currency, locale)} tone={c.overdueReceivables > 0 ? "risk" : "default"} />
              </div>
              {(() => {
                const forecast = f.forecast.find((x) => x.currency === c.currency);
                if (!forecast) return null;
                return (
                  <div>
                    <p className="mb-1 text-[11px] text-muted-foreground">{t.forecast} · {t.forecastHint}</p>
                    <ul className="flex flex-wrap gap-2">
                      {forecast.months.map((m) => (
                        <li key={m.month} className="min-w-24 flex-1 rounded-md border px-3 py-1.5">
                          <p className="text-[11px] text-muted-foreground uppercase">{monthFmt.format(new Date(`${m.month}-01T00:00:00Z`))}</p>
                          <p className={cn("text-sm font-semibold tabular-nums", m.ending < 0 && "text-red-400")}>{formatMoney(m.ending, c.currency, locale)}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </section>
          ))}
          <Link href={cashflowHref} className={buttonVariants({ size: "xs", variant: "ghost" })}>{dict.finance.tabs.cashflow}</Link>
        </div>
      )}
    </DashboardCard>
  );
}
