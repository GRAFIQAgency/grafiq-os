import Link from "next/link";

import { DetailSection } from "@/components/shared/detail-section";
import { buttonVariants } from "@/components/ui/button";
import { getModule } from "@/config/modules";
import { moduleMetadata } from "@/lib/i18n/metadata";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { formatDate, formatMoney } from "@/lib/format";
import { OverviewCards } from "@/modules/finance/components/overview-cards";
import { RiskList } from "@/modules/finance/components/risk-list";
import { financeHrefs, getFinanceOverview, listPayableViews, listReceivableViews } from "@/modules/finance/queries";

export const generateMetadata = moduleMetadata("finance");

export default async function FinanceOverviewPage() {
  const [dict, locale, overview, receivables, payables] = await Promise.all([getDictionary(), getLocale(), getFinanceOverview(), listReceivableViews(), listPayableViews()]);
  const t = dict.finance.overview;
  const hrefs = financeHrefs();
  const nextIn = receivables.filter((r) => r.state === "open" && r.outstanding > 0 && r.bucket !== "upcoming").slice(0, 5);
  const nextOut = payables.filter((p) => p.state === "open" && p.outstanding > 0 && p.bucket !== "upcoming").slice(0, 5);

  return (
    <div className="space-y-6">
      <p className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground" data-guide="finance-concept"><span className="font-medium text-foreground">{dict.finance.concept.title}.</span> {dict.finance.concept.body}</p>

      {!overview.hasAccounts ? (
        <div className="space-y-3 rounded-lg border border-dashed px-6 py-8 text-center">
          <p className="text-sm font-medium">{t.setupTitle}</p>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{t.setupBody}</p>
          <div className="flex justify-center gap-2">
            <Link href={hrefs.cashflow} className={buttonVariants({ size: "sm" })}>{t.setupAccounts}</Link>
            <Link href={getModule("projects").href} className={buttonVariants({ size: "sm", variant: "outline" })}>{t.setupSchedule}</Link>
          </div>
        </div>
      ) : null}

      <OverviewCards items={overview.currencies} dict={dict} locale={locale} />
      {overview.currencies.length > 1 ? <p className="text-[11px] text-muted-foreground">{dict.finance.common.perCurrency}</p> : null}

      <DetailSection title={t.risksTitle}>
        <RiskList risks={overview.risks} dict={dict} locale={locale} />
      </DetailSection>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DetailSection title={t.quickReceivables} action={<Link href={hrefs.receivables} className={buttonVariants({ size: "xs", variant: "ghost" })}>{t.seeAll}</Link>}>
          {nextIn.length === 0 ? <p className="text-sm text-muted-foreground">{dict.finance.common.noData}</p> : (
            <ul className="divide-y divide-border/60 text-sm">
              {nextIn.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0"><span className="line-clamp-1 font-medium">{[r.clientName, r.label].filter(Boolean).join(" · ")}</span><span className={`text-xs ${r.status === "overdue" ? "text-red-400" : "text-muted-foreground"}`}>{formatDate(r.dueDate, locale)} · {dict.finance.statuses[r.status]}</span></span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatMoney(r.outstanding, r.currency, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </DetailSection>
        <DetailSection title={t.quickPayables} action={<Link href={hrefs.payables} className={buttonVariants({ size: "xs", variant: "ghost" })}>{t.seeAll}</Link>}>
          {nextOut.length === 0 ? <p className="text-sm text-muted-foreground">{dict.finance.common.noData}</p> : (
            <ul className="divide-y divide-border/60 text-sm">
              {nextOut.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0"><span className="line-clamp-1 font-medium">{[p.payeeName, p.label].filter(Boolean).join(" · ")}</span><span className={`text-xs ${p.status === "overdue" ? "text-red-400" : "text-muted-foreground"}`}>{formatDate(p.dueDate, locale)} · {dict.finance.statuses[p.status]}</span></span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatMoney(p.outstanding, p.currency, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </DetailSection>
      </div>
    </div>
  );
}
