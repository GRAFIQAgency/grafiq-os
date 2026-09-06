import type { LucideIcon } from "lucide-react";

export interface DashboardStat {
  id: string;
  label: string;
  /** Pre-formatted display value. Formatting belongs in services, not the UI. */
  value: string;
  /** Short supporting text, e.g. "vs last month". */
  hint: string;
  icon: LucideIcon;
  tone?: "default" | "warning";
}
