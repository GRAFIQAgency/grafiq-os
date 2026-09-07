import Link from "next/link";
import { Globe } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { getModule } from "@/config/modules";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ScoreBadge } from "@/modules/sourcing/components/shared/score-badge";
import { HIGH_LEAD_SCORE } from "@/modules/sourcing/constants";

import { STALE_AFTER_DAYS } from "../constants";
import type { Deal } from "../types";
import { StageBadge } from "./stage-badge";

export function DealsEmpty({ dict, filtered }: { dict: Dictionary; filtered: boolean }) {
  const t = dict.sales;
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center" data-guide="sales-list">
      <p className="text-sm font-medium">{filtered ? t.emptyFiltered : t.empty}</p>
      {!filtered ? (
        <>
          <p className="max-w-sm text-sm text-muted-foreground">{t.fromSourcing}</p>
          <Link href={`${getModule("sourcing").href}/companies`} className={buttonVariants({ size: "sm" })}>{t.goToSourcing}</Link>
        </>
      ) : null}
    </div>
  );
}

export function DealsTable({ deals, dict, locale }: { deals: Deal[]; dict: Dictionary; locale: Locale }) {
  const t = dict.sales;
  const cols = t.columns;
  const base = getModule("sales").href;

  return (
    <div className="overflow-x-auto rounded-lg border" data-guide="sales-list">
      <table className="w-full min-w-[1000px] text-sm">
        <thead className="bg-muted/30 text-xs text-muted-foreground">
          <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
            <th>{cols.company}</th>
            <th>{cols.stage}</th>
            <th>{cols.owner}</th>
            <th className="text-right!">{cols.value}</th>
            <th className="text-right!">{cols.probability}</th>
            <th className="text-right!">{cols.weighted}</th>
            <th>{cols.expectedClose}</th>
            <th>{cols.nextAction}</th>
            <th>{cols.score}</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((d) => {
            const c = d.company;
            const href = `${base}/${c.id}`;
            const stale = d.isOpen && !d.details.nextActionAt && d.ageDays >= STALE_AFTER_DAYS;
            return (
              <tr key={c.id} className={cn("relative border-t transition-colors hover:bg-muted/30", !d.isOpen && "opacity-60")}>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40 text-muted-foreground">
                      {c.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.logoUrl} alt="" className="size-full object-cover" />
                      ) : <Globe className="size-4" />}
                    </div>
                    <div className="min-w-0">
                      <Link href={href} className="font-medium hover:underline after:absolute after:inset-0">{c.name}</Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {[c.industry, [c.city, c.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <StageBadge stage={d.stage} dict={dict} />
                  {stale ? <span className="block text-[11px] text-amber-400">{t.staleHint}</span> : null}
                </td>
                <td className="px-3 py-2.5 text-xs">{d.ownerName ?? <span className="text-muted-foreground">{t.unassigned}</span>}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(d.details.dealValue, d.details.dealCurrency, locale)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {d.probability} %
                  {d.probabilityIsCustom ? <span className="block text-[11px] text-muted-foreground">{t.customProbability}</span> : null}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{formatMoney(d.weightedValue, d.details.dealCurrency, locale)}</td>
                <td className="px-3 py-2.5 text-xs">{formatDate(d.details.expectedClose, locale)}</td>
                <td className="px-3 py-2.5 text-xs">
                  <span className={cn(d.nextActionOverdue && "font-medium text-red-400")}>{formatDate(d.details.nextActionAt, locale)}</span>
                  {d.details.nextStep ? <span className="block max-w-[220px] truncate text-muted-foreground">{d.details.nextStep}</span> : null}
                </td>
                <td className="px-3 py-2.5"><ScoreBadge score={c.leadScore} manual={c.manualScore} highFrom={HIGH_LEAD_SCORE} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
