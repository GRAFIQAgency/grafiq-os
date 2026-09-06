import type { LucideIcon } from "lucide-react";

export type DashboardStatId = "active-projects" | "pipeline" | "revenue" | "capacity" | "at-risk";

/** Value + presentation of a stat; labels are translated (dict.dashboard.stats). */
export interface DashboardStatSeed {
  id: DashboardStatId;
  /** Pre-formatted display value. Formatting belongs in services, not the UI. */
  value: string;
  icon: LucideIcon;
  tone?: "default" | "warning";
}

/** A stat ready to render. */
export interface DashboardStat extends DashboardStatSeed {
  label: string;
  hint: string;
}
