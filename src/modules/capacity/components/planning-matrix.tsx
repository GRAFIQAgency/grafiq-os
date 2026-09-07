import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { DetailSection } from "@/components/shared/detail-section";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

import { MATRIX_HORIZONS } from "../constants";
import { hours, percent, shortMonthLabel } from "../services/format";
import { capacityHref, personHref, type CapacityParams } from "../services/links";
import type { MatrixRow, Period } from "../types";
import { HEALTH_CELL } from "./health-badge";

/** Compact heatmap: one row per person, one column per month. Not a Gantt. */
export function PlanningMatrix({ periods, rows, horizon, params, dict, locale }: { periods: Period[]; rows: MatrixRow[]; horizon: number; params: CapacityParams; dict: Dictionary; locale: Locale }) {
  const t = dict.capacity.matrix;
  return (
    <DetailSection
      title={t.title}
      action={
        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs text-muted-foreground">{t.horizon}</span>
          {MATRIX_HORIZONS.map((h) => (
            <Link key={h} href={capacityHref(params, { horizon: String(h) })} aria-current={horizon === h ? "page" : undefined} className={cn(buttonVariants({ size: "xs", variant: horizon === h ? "secondary" : "ghost" }))}>
              {interpolate(t.months, { n: h })}
            </Link>
          ))}
        </div>
      }
    >
      <div data-guide="capacity-matrix">
        <p className="mb-3 text-xs text-muted-foreground">{t.description}</p>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">{t.empty}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="sticky left-0 bg-card py-1.5 pr-3 text-left font-medium">{dict.capacity.columns.person}</th>
                  {periods.map((p) => <th key={p.start} className="px-1 py-1.5 text-center font-medium">{shortMonthLabel(p, locale)}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.person.key}>
                    <td className="sticky left-0 bg-card py-1 pr-3">
                      <Link href={personHref(r.person.key, params)} className="hover:underline">{r.person.name}</Link>
                      <span className="block truncate text-[11px] text-muted-foreground">{r.person.role ?? dict.capacity.kinds[r.person.kind]}</span>
                    </td>
                    {r.cells.map((c) => (
                      <td key={c.period.start} className="px-1 py-1">
                        <Link
                          href={capacityHref(params, { kind: undefined, period: c.period.start.slice(0, 7) })}
                          className={cn("block rounded-md px-2 py-1.5 text-center text-xs font-medium tabular-nums transition-opacity hover:opacity-80", HEALTH_CELL[c.health])}
                          title={c.available == null ? dict.capacity.notConfigured : `${hours(c.booked, locale)} / ${hours(c.available, locale)}`}
                        >
                          {c.available == null ? "—" : percent(c.utilization, locale)}
                        </Link>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DetailSection>
  );
}
