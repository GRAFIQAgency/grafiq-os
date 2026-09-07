import { DetailSection, Facts } from "@/components/shared/detail-section";
import { formatHours, formatMoney, formatPercent } from "@/lib/format";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";

import type { ProjectDetail } from "../types";
import { ChangeRequestsPanel, DirectCostsPanel } from "./financials-forms";

export function FinancialsTab({ detail, dict, locale }: { detail: ProjectDetail; dict: Dictionary; locale: Locale }) {
  const t = dict.projects.financials;
  const f = detail.financials;
  const cur = detail.project.currency;
  const money = (v: number | null | undefined) => formatMoney(v, cur, locale);
  const pct = (v: number | null | undefined) => formatPercent(v, locale, 1);

  return (
    <div className="space-y-6" data-guide="projects-financials">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DetailSection title={t.baseline}>
          <p className="mb-3 text-xs text-muted-foreground">{t.baselineHint}</p>
          <Facts columns={1} items={[
            { label: t.soldRevenue, value: money(f.baseline.revenue) },
            { label: t.directCost, value: money(f.baseline.directCost) },
            { label: t.grossProfit, value: money(f.baseline.grossProfit) },
            { label: t.grossMargin, value: <span className="font-semibold">{pct(f.baseline.grossMargin)}</span> },
          ]} />
        </DetailSection>
        <DetailSection title={t.current}>
          <p className="mb-3 text-xs text-muted-foreground">{t.currentHint}</p>
          <Facts columns={1} items={[
            { label: t.currentRevenue, value: money(f.current.revenue) },
            { label: t.actualLabour, value: money(f.current.actualLabourCost) },
            { label: t.actualFixed, value: money(f.current.actualFixedCost) },
            { label: t.grossProfit, value: money(f.current.grossProfit) },
            { label: t.grossMargin, value: <span className="font-semibold">{pct(f.current.grossMargin)}</span> },
          ]} />
          <p className="mt-3 text-xs text-muted-foreground">{interpolate(t.hoursValue, { actual: f.current.actualHours, estimated: f.current.estimatedHours })}</p>
          {f.current.unpricedHours > 0 ? <p className="mt-1 text-xs text-amber-400">{interpolate(t.unpricedHours, { n: f.current.unpricedHours })}</p> : null}
        </DetailSection>
        <DetailSection title={t.forecast}>
          <p className="mb-3 text-xs text-muted-foreground">{f.forecast.basis === "baseline" ? t.forecastBaseline : t.forecastHint}</p>
          <Facts columns={1} items={[
            { label: t.currentRevenue, value: money(f.forecast.revenue) },
            { label: t.labourForecast, value: money(f.forecast.labourCost) },
            { label: t.fixedForecast, value: money(f.forecast.fixedCost) },
            { label: t.approvedChanges, value: `+${money(f.approvedChanges.revenue)} / ${money(f.approvedChanges.directCost)}` },
            { label: t.directCost, value: money(f.forecast.directCost) },
            { label: t.grossMargin, value: <span className="font-semibold">{pct(f.forecast.grossMargin)}</span> },
          ]} />
        </DetailSection>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DetailSection title={t.contractValue}>
          <Facts columns={1} items={[
            { label: t.originalValue, value: money(f.baseline.revenue) },
            { label: t.changesValue, value: `+${money(f.approvedChanges.revenue)}` },
            { label: t.contractValue, value: <span className="font-semibold">{money(f.current.revenue)}</span> },
          ]} />
        </DetailSection>
        <DetailSection title={t.baselineCosts} className="lg:col-span-2">
          {detail.baselineCosts.length ? (
            <table className="w-full text-sm">
              <tbody>
                {detail.baselineCosts.map((c) => (
                  <tr key={c.id} className="border-b border-border/60">
                    <td className="py-1.5">{c.name}</td>
                    <td className="py-1.5 text-xs text-muted-foreground">{c.kind === "hourly" ? `${formatHours(c.hours, locale)} × ${money(c.hourlyRate)}` : c.kind === "percent" ? `${c.percent} % ${dict.pricing.costs.ofPrice}` : dict.pricing.costs.fixed}</td>
                    <td className="py-1.5 text-right tabular-nums">{money(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-muted-foreground">{t.noBaselineCosts}</p>}
        </DetailSection>
      </div>

      <DirectCostsPanel projectId={detail.project.id} currency={cur} costs={detail.costs} />
      <ChangeRequestsPanel projectId={detail.project.id} currency={cur} changes={detail.changeRequests} />
    </div>
  );
}
