import Link from "next/link";

import { getModule } from "@/config/modules";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

import { CRM_STAGES } from "../constants";
import type { Deal } from "../types";

/** Kanban-style view: one column per stage. Stage changes happen on the deal page. */
export function PipelineBoard({ deals, dict, locale }: { deals: Deal[]; dict: Dictionary; locale: Locale }) {
  const t = dict.sales;
  const base = getModule("sales").href;
  return (
    <div className="overflow-x-auto" data-guide="sales-list">
      <div className="grid min-w-[1120px] grid-cols-7 gap-3">
        {CRM_STAGES.map((stage) => {
          const column = deals.filter((d) => d.stage === stage);
          return (
            <div key={stage} className={cn("rounded-md border bg-muted/20 p-2", (stage === "customer" || stage === "lost") && "opacity-90")}>
              <p className="mb-2 flex items-center justify-between px-1 text-xs font-medium text-muted-foreground">
                {t.stages[stage]} <span className="tabular-nums">({column.length})</span>
              </p>
              <div className="space-y-2">
                {column.map((d) => (
                  <Link key={d.company.id} href={`${base}/${d.company.id}`} className="block rounded-md border bg-card p-2 text-left text-sm hover:bg-muted/40">
                    <p className="truncate font-medium">{d.company.name}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatMoney(d.details.dealValue, d.details.dealCurrency, locale)} · {d.probability} %
                    </p>
                    {d.details.nextActionAt ? (
                      <p className={cn("text-[11px] text-muted-foreground", d.nextActionOverdue && "font-medium text-red-400")}>
                        {t.columns.nextAction}: {formatDate(d.details.nextActionAt, locale)}
                      </p>
                    ) : null}
                    {d.ownerName ? <p className="truncate text-[11px] text-muted-foreground">{d.ownerName}</p> : null}
                  </Link>
                ))}
                {column.length === 0 ? <p className="px-1 py-3 text-center text-[11px] text-muted-foreground/70">—</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
