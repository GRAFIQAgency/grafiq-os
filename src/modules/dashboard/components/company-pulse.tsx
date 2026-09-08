import { formatMoney, formatPercent } from "@/lib/format";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";
import type { Currency } from "@/types/database";

import type { DashboardData } from "../types";

function MoneyByCurrency({ values, locale, fallback }: { values: [string, number][]; locale: Locale; fallback: string }) {
  if (!values.length) return <span className="text-muted-foreground">{fallback}</span>;
  return (
    <span className="flex flex-col">
      {values.map(([currency, amount]) => <span key={currency}>{formatMoney(amount, currency as Currency, locale)}</span>)}
    </span>
  );
}

function Cell({ label, children, hint, tone = "default" }: { label: string; children: React.ReactNode; hint?: string; tone?: "default" | "risk" | "muted" }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className={cn("mt-1 text-lg font-semibold tracking-tight tabular-nums", tone === "risk" && "text-red-400", tone === "muted" && "text-muted-foreground")}>{children}</div>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** The seven numbers a founder checks first. Currencies are listed, never summed. */
export function CompanyPulse({ data, dict, locale }: { data: DashboardData; dict: Dictionary; locale: Locale }) {
  const t = dict.dashboard.pulse;
  const unknown = dict.dashboard.unknown;
  const projects = data.projects.data;
  const sales = data.sales.data;
  const capacity = data.capacity.data;
  // QA with no checklist at all is unknown, not "0 things need attention".
  const qa = data.qa.state === "ok" ? data.qa.data : null;
  const finance = data.finance.data;
  const overdue = finance?.currencies.filter((c) => c.overdueReceivables > 0) ?? [];
  const expectedIn = finance?.currencies.filter((c) => c.expectedIn30 > 0) ?? [];
  const cashKnown = finance?.hasAccounts ?? false;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" data-guide="dashboard-pulse">
      <Cell label={t.activeProjects} hint={projects ? t.inDelivery : undefined} tone={projects ? "default" : "muted"}>
        {projects ? projects.active : unknown}
      </Cell>
      <Cell label={t.atRisk} tone={projects && projects.atRisk > 0 ? "risk" : projects ? "default" : "muted"} hint={projects && projects.critical > 0 ? interpolate(t.criticalOf, { n: projects.critical }) : undefined}>
        {projects ? projects.atRisk : unknown}
      </Cell>
      <Cell label={t.pipeline} hint={sales ? interpolate(t.itemsCount, { n: sales.openDeals }) : undefined}>
        {sales ? <MoneyByCurrency values={Object.entries(sales.openValue)} locale={locale} fallback={t.noPipeline} /> : unknown}
      </Cell>
      <Cell label={t.expectedIn} tone={finance ? "default" : "muted"}>
        {finance ? <MoneyByCurrency values={expectedIn.map((c) => [c.currency, c.expectedIn30])} locale={locale} fallback={formatMoney(0, null, locale)} /> : unknown}
      </Cell>
      <Cell label={t.overdue} tone={overdue.length ? "risk" : "default"} hint={finance ? interpolate(t.itemsCount, { n: finance.currencies.reduce((s, c) => s + c.overdueReceivableCount, 0) }) : undefined}>
        {finance ? <MoneyByCurrency values={overdue.map((c) => [c.currency, c.overdueReceivables])} locale={locale} fallback={formatMoney(0, null, locale)} /> : unknown}
      </Cell>
      <Cell label={t.utilization} tone={capacity?.utilization == null ? "muted" : capacity.overloadedPeople > 0 ? "risk" : "default"} hint={capacity?.utilization == null ? t.noCapacity : t.thisMonth}>
        {capacity?.utilization == null ? unknown : formatPercent(capacity.utilization, locale, 0)}
      </Cell>
      <Cell label={t.qaAttention} tone={qa && qa.needsFixes + qa.overdue > 0 ? "risk" : qa ? "default" : "muted"}>
        {qa ? qa.needsFixes + qa.overdue : unknown}
      </Cell>
      {!cashKnown ? <Cell label={dict.dashboard.finance.cash} tone="muted" hint={t.noAccounts}>{unknown}</Cell> : (
        <Cell label={dict.dashboard.finance.cash}>
          <MoneyByCurrency values={(finance?.currencies ?? []).filter((c) => !c.cash.unknown).map((c) => [c.currency, c.cash.available])} locale={locale} fallback={unknown} />
        </Cell>
      )}
    </div>
  );
}
