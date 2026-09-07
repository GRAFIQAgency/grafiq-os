import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/config";

import type { CapacityHealth } from "../types";

/** One palette for every capacity colour in the module. */
export const HEALTH_CLASS: Record<CapacityHealth, string> = {
  green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  yellow: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  orange: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  red: "border-red-500/30 bg-red-500/10 text-red-400",
  unconfigured: "border-dashed text-muted-foreground",
  unavailable: "text-muted-foreground opacity-70",
};

export const HEALTH_BAR: Record<CapacityHealth, string> = {
  green: "bg-emerald-500",
  yellow: "bg-yellow-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  unconfigured: "bg-muted-foreground/30",
  unavailable: "bg-muted-foreground/30",
};

/** Cell background for the planning matrix. */
export const HEALTH_CELL: Record<CapacityHealth, string> = {
  green: "bg-emerald-500/15 text-emerald-300",
  yellow: "bg-yellow-500/20 text-yellow-300",
  orange: "bg-orange-500/25 text-orange-300",
  red: "bg-red-500/30 text-red-300",
  unconfigured: "bg-muted/30 text-muted-foreground",
  unavailable: "bg-muted/20 text-muted-foreground/60",
};

export function HealthBadge({ health, dict, className }: { health: CapacityHealth; dict: Dictionary; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 items-center rounded-full border px-2 text-xs font-medium whitespace-nowrap", HEALTH_CLASS[health], className)}>
      {dict.capacity.health[health]}
    </span>
  );
}

/** Utilization bar: fills to 100 %, overload shown as a second red segment. */
export function UtilizationBar({ utilization, health, className }: { utilization: number | null; health: CapacityHealth; className?: string }) {
  const value = utilization ?? 0;
  const fill = Math.min(100, value);
  const over = Math.min(100, Math.max(0, value - 100));
  return (
    <div className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-muted", className)} aria-hidden>
      <div className={cn("h-full rounded-full", HEALTH_BAR[health])} style={{ width: `${fill}%` }} />
      {over > 0 ? <div className="absolute inset-y-0 right-0 h-full bg-red-500/60" style={{ width: `${over / 2}%` }} /> : null}
    </div>
  );
}
