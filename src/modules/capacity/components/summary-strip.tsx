import type { Dictionary, Locale } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

import { hours, percent } from "../services/format";
import type { CapacitySummary } from "../types";

export function SummaryStrip({ summary, dict, locale }: { summary: CapacitySummary; dict: Dictionary; locale: Locale }) {
  const t = dict.capacity.summary;
  const items = [
    { label: t.available, value: hours(summary.totalAvailable, locale), hint: summary.peopleUnconfigured ? interpolate(t.unconfigured, { n: summary.peopleUnconfigured }) : t.availableHint },
    { label: t.booked, value: hours(summary.totalBooked, locale), hint: summary.totalUnscheduled > 0 ? interpolate(t.unscheduled, { h: hours(summary.totalUnscheduled, locale) }) : t.bookedHint, warn: summary.totalUnscheduled > 0 },
    { label: t.remaining, value: hours(summary.remaining, locale), hint: t.remainingHint, warn: summary.remaining < 0 },
    { label: t.utilization, value: percent(summary.utilization, locale), hint: t.utilizationHint, warn: (summary.utilization ?? 0) >= 100 },
    { label: t.overloaded, value: String(summary.overloadedPeople), hint: t.overloadedHint, warn: summary.overloadedPeople > 0 },
    { label: t.free, value: String(summary.peopleWithFreeCapacity), hint: t.freeHint },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" data-guide="capacity-summary">
      {items.map((i) => (
        <div key={i.label} className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">{i.label}</p>
          <p className={cn("mt-1 text-lg font-semibold tabular-nums", i.warn && "text-red-400")}>{i.value}</p>
          <p className={cn("text-[11px] text-muted-foreground/80", i.warn && "text-amber-400/90")}>{i.hint}</p>
        </div>
      ))}
    </div>
  );
}
