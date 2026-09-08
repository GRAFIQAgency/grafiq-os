import Link from "next/link";
import { AlertTriangle, ArrowRight, Info, TriangleAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/format";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";
import { formatRiskParams } from "@/modules/finance/services/risk-format";
import type { FinanceRisk } from "@/modules/finance/types";
import { cn } from "@/lib/utils";

import type { DashboardAttentionItem, DashboardSeverity } from "../types";

const TONE: Record<DashboardSeverity, string> = {
  critical: "border-red-500/40 bg-red-500/5",
  high: "border-orange-500/30 bg-orange-500/5",
  attention: "border-amber-500/30 bg-amber-500/5",
  info: "border-border bg-muted/10",
};
const LABEL_TONE: Record<DashboardSeverity, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  attention: "text-amber-400",
  info: "text-muted-foreground",
};

/**
 * The most important section: one deterministic list of everything the modules
 * flagged, most urgent first. Finance items keep the Finance sentence, project
 * items keep the project's own health reasons.
 */
export function NeedsAttention({ items, dict, locale }: { items: DashboardAttentionItem[]; dict: Dictionary; locale: Locale }) {
  const t = dict.dashboard.attention;

  const texts = (item: DashboardAttentionItem) => {
    if (item.textSource === "finance") {
      const risk = { code: item.code, severity: "risk", currency: item.currency, params: item.params, href: item.href } as FinanceRisk;
      const params = formatRiskParams(risk, locale);
      const entry = (dict.finance.risks as unknown as Record<string, { title?: string; reason?: string }>)[item.code];
      return entry?.title ? { title: interpolate(entry.title, params), description: interpolate(entry.reason ?? "", params) } : { title: item.code, description: "" };
    }
    const entry = (t as unknown as Record<string, { title?: string; description?: string }>)[item.code];
    return entry?.title ? { title: interpolate(entry.title, item.params), description: interpolate(entry.description ?? "", item.params) } : { title: item.code, description: "" };
  };

  return (
    <Card className="gap-4" data-guide="dashboard-attention">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            {items.length ? <TriangleAlert className="size-4 text-amber-400" /> : null}
            {t.title}
            {items.length ? <span className="rounded bg-muted px-1.5 text-xs font-normal text-muted-foreground tabular-nums">{items.length}</span> : null}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed px-4 py-8 text-center">
            <p className="text-sm font-medium text-emerald-400">{t.empty}</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">{t.emptyHint}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const { title, description } = texts(item);
              const reasons = item.reasonSource === "projects"
                ? item.reasons.map((r) => interpolate((dict.projects.healthReasons as Record<string, string>)[r.code] ?? r.code, r.params)).join(" · ")
                : "";
              return (
                <li key={item.id}>
                  <Link href={item.href} className={cn("flex flex-col gap-1 rounded-md border px-3 py-2.5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-start sm:justify-between sm:gap-4", TONE[item.severity])}>
                    <div className="min-w-0 space-y-0.5">
                      <p className="flex items-start gap-2 text-sm font-medium">
                        {item.severity === "info" ? <Info className={cn("mt-0.5 size-3.5 shrink-0", LABEL_TONE[item.severity])} /> : <AlertTriangle className={cn("mt-0.5 size-3.5 shrink-0", LABEL_TONE[item.severity])} />}
                        <span className="min-w-0">{title}</span>
                      </p>
                      <p className="pl-5.5 text-xs text-muted-foreground">{reasons || description}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 pl-5.5 text-xs sm:pl-0">
                      {item.value ? <span className="tabular-nums text-muted-foreground">{formatMoney(item.value.amount, item.value.currency, locale)}</span> : null}
                      {item.date ? <span className="tabular-nums text-muted-foreground">{formatDate(item.date, locale)}</span> : null}
                      <span className={cn("font-medium whitespace-nowrap", LABEL_TONE[item.severity])}>{t.severities[item.severity]}</span>
                      <span className="text-[11px] whitespace-nowrap text-muted-foreground">{t.sources[item.source]}</span>
                      <ArrowRight className="size-3.5 text-muted-foreground" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
