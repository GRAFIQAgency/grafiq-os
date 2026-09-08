import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { formatDate, formatMoney } from "@/lib/format";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { INTL_LOCALES } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

import type { FinanceRisk } from "../types";

const MONEY = new Set(["ending", "outgoing", "incoming", "starting", "amount", "shortfall", "largest", "contract", "scheduled"]);
const DATES = new Set(["date", "asOf"]);

/** Every warning says WHY, with the numbers that explain it. */
export function RiskList({ risks, dict, locale, compact = false }: { risks: FinanceRisk[]; dict: Dictionary; locale: Locale; compact?: boolean }) {
  const t = dict.finance.risks;
  const monthFmt = new Intl.DateTimeFormat(INTL_LOCALES[locale], { month: "long", year: "numeric" });
  const format = (r: FinanceRisk) => {
    const p: Record<string, string | number> = { currency: r.currency ?? "" };
    for (const [k, v] of Object.entries(r.params)) {
      if (k === "month" && typeof v === "string") p[k] = monthFmt.format(new Date(`${v}-01T00:00:00Z`));
      else if (MONEY.has(k) && typeof v === "number") p[k] = formatMoney(v, r.currency, locale);
      else if (DATES.has(k) && typeof v === "string") p[k] = formatDate(v, locale);
      else p[k] = v;
    }
    return p;
  };
  if (!risks.length) return <p className="text-sm text-emerald-400">{dict.finance.overview.noRisks}</p>;
  return (
    <ul className="space-y-2" data-guide="finance-risks">
      {risks.map((r, i) => {
        const p = format(r);
        const texts = t[r.code];
        return (
          <li key={`${r.code}-${i}`} className={cn("flex flex-col gap-1 rounded-md border px-3 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4", r.severity === "risk" ? "border-red-500/30 bg-red-500/5" : "border-amber-500/30 bg-amber-500/5")}>
            <div className="min-w-0 space-y-0.5">
              <p className={cn("flex items-start gap-2 text-sm font-medium", r.severity === "risk" ? "text-red-300" : "text-amber-300")}>
                {r.severity === "risk" ? <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> : <Info className="mt-0.5 size-3.5 shrink-0" />}
                <span>{interpolate(texts.title, p)}</span>
              </p>
              {!compact ? <p className="pl-5.5 text-xs text-muted-foreground">{interpolate(texts.reason, p)}</p> : null}
            </div>
            {r.href ? <Link href={r.href} className={cn(buttonVariants({ size: "xs", variant: "ghost" }), "shrink-0 self-start")}>{t.act}</Link> : null}
          </li>
        );
      })}
    </ul>
  );
}
