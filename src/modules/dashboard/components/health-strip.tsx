import Link from "next/link";

import type { Dictionary } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

import type { AreaHealth, HealthStatus } from "../types";

const TONE: Record<HealthStatus, string> = {
  healthy: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
  attention: "border-amber-500/30 bg-amber-500/5 text-amber-400",
  risk: "border-red-500/30 bg-red-500/5 text-red-400",
  unknown: "border-border bg-muted/20 text-muted-foreground",
};

/** Five plain statuses, each with the rule that produced it. No composite score. */
export function HealthStrip({ areas, dict }: { areas: AreaHealth[]; dict: Dictionary }) {
  const t = dict.dashboard.health;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-guide="dashboard-health">
      {areas.map((a) => (
        <Link key={a.area} href={a.href} className={cn("rounded-lg border px-3 py-2.5 transition-opacity hover:opacity-80", TONE[a.status])}>
          <p className="flex items-baseline justify-between gap-2 text-xs font-semibold tracking-wide uppercase">
            {t.areas[a.area]}
            <span className="text-[11px] font-medium normal-case">{t.statuses[a.status]}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{interpolate((t.reasons as Record<string, string>)[a.code] ?? a.code, a.params)}</p>
        </Link>
      ))}
    </div>
  );
}
