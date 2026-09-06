"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/interpolate";
import type { MarginThresholds } from "@/modules/settings/types";

import { formatMoney, formatPercent } from "../format";
import type { Currency, PricingSummary } from "../types";
import { HealthBadge, healthDescription } from "./health-badge";

interface FinancialSummaryProps {
  summary: PricingSummary;
  currency: Currency;
  thresholds: MarginThresholds;
}

export function FinancialSummary({ summary, currency, thresholds }: FinancialSummaryProps) {
  const { dict, locale } = useI18n();
  const t = dict.pricing.summary;
  const healthText = dict.pricing.health;
  const hasRevenue = summary.revenue > 0;
  const money = (v: number | null) => (v === null ? "—" : formatMoney(v, currency, locale));

  return (
    <Card className="gap-5 lg:sticky lg:top-20">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border bg-muted/30 p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">{t.grossMargin}</p>
            {hasRevenue ? (
              <HealthBadge status={summary.health} text={healthText} />
            ) : (
              <span className="inline-flex h-5 items-center rounded-full border border-dashed px-2 text-xs text-muted-foreground">
                {t.noPriceYet}
              </span>
            )}
          </div>
          <p
            className={cn(
              "mt-2 text-5xl font-semibold tracking-tight tabular-nums",
              !hasRevenue && "text-muted-foreground/50"
            )}
          >
            {formatPercent(summary.grossMargin, locale)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {hasRevenue ? healthDescription(summary.health, healthText) : t.enterPrice}
          </p>
          {hasRevenue && summary.requiresApproval ? (
            <p className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-400">
              {interpolate(t.approvalRequired, { min: formatPercent(thresholds.minimum, locale, 0) })}
            </p>
          ) : null}
        </div>

        <dl className="space-y-3 text-sm">
          <SummaryRow label={t.revenue} value={money(summary.revenue)} />
          <SummaryRow label={t.directCosts} value={money(summary.directCosts)} />
          <SummaryRow
            label={t.grossProfit}
            value={money(summary.grossProfit)}
            valueClassName={cn("font-semibold", summary.grossProfit < 0 && "text-red-400")}
          />
          <Separator />
          <SummaryRow
            label={t.targetMargin}
            value={formatPercent(summary.targetMargin, locale, 0)}
            hint={interpolate(t.thresholdsHint, {
              target: formatPercent(thresholds.target, locale, 0),
              warning: formatPercent(thresholds.warning, locale, 0),
            })}
          />
          <SummaryRow
            label={t.recommendedPrice}
            value={money(summary.recommendedPrice)}
            valueClassName="font-semibold"
            hint={t.recommendedHint}
          />
        </dl>

        <div className="flex items-center justify-between rounded-md border px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">{t.health}</span>
          {hasRevenue ? (
            <HealthBadge status={summary.health} text={healthText} />
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface SummaryRowProps {
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
}

function SummaryRow({ label, value, hint, valueClassName }: SummaryRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">
        {label}
        {hint ? <span className="block text-xs text-muted-foreground/70">{hint}</span> : null}
      </dt>
      <dd className={cn("shrink-0 text-right whitespace-nowrap tabular-nums", valueClassName)}>{value}</dd>
    </div>
  );
}
