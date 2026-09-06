import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { formatMoney, formatPercent } from "../format";
import type { Currency, PricingSummary } from "../types";
import { HEALTH_DESCRIPTIONS, HealthBadge } from "./health-badge";

interface FinancialSummaryProps {
  summary: PricingSummary;
  currency: Currency;
}

export function FinancialSummary({ summary, currency }: FinancialSummaryProps) {
  const hasRevenue = summary.revenue > 0;
  const money = (v: number | null) => (v === null ? "—" : formatMoney(v, currency));

  return (
    <Card className="gap-5 lg:sticky lg:top-20">
      <CardHeader>
        <CardTitle>Financial summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border bg-muted/30 p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">Gross margin</p>
            {hasRevenue ? (
              <HealthBadge status={summary.health} />
            ) : (
              <span className="inline-flex h-5 items-center rounded-full border border-dashed px-2 text-xs text-muted-foreground">
                No price yet
              </span>
            )}
          </div>
          <p
            className={cn(
              "mt-2 text-5xl font-semibold tracking-tight tabular-nums",
              !hasRevenue && "text-muted-foreground/50"
            )}
          >
            {formatPercent(summary.grossMargin)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {hasRevenue
              ? HEALTH_DESCRIPTIONS[summary.health]
              : "Enter the client price to evaluate this project."}
          </p>
        </div>

        <dl className="space-y-3 text-sm">
          <SummaryRow label="Revenue" value={money(summary.revenue)} />
          <SummaryRow label="Direct costs" value={money(summary.directCosts)} />
          <SummaryRow
            label="Gross profit"
            value={money(summary.grossProfit)}
            valueClassName={cn("font-semibold", summary.grossProfit < 0 && "text-red-400")}
          />
          <Separator />
          <SummaryRow label="Target margin" value={formatPercent(summary.targetMargin, 0)} />
          <SummaryRow
            label="Recommended price"
            value={money(summary.recommendedPrice)}
            valueClassName="font-semibold"
            hint="Minimum price to reach the target margin"
          />
        </dl>

        <div className="flex items-center justify-between rounded-md border px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">Project health</span>
          {hasRevenue ? <HealthBadge status={summary.health} /> : <span className="text-muted-foreground">—</span>}
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
      <dd className={cn("text-right tabular-nums", valueClassName)}>{value}</dd>
    </div>
  );
}
