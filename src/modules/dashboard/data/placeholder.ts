import { AlertTriangle, Banknote, FolderKanban, Gauge, TrendingUp } from "lucide-react";

import type { DashboardStatSeed } from "../types";

/**
 * PLACEHOLDER DATA — not connected to any real source.
 * Replace with real queries in `src/modules/dashboard/queries.ts` when the
 * Projects, Sales, Finance and Capacity modules exist.
 * Labels and hints come from the i18n dictionary (dict.dashboard.stats).
 */
export const placeholderStats: readonly DashboardStatSeed[] = [
  { id: "active-projects", value: "12", icon: FolderKanban },
  { id: "pipeline", value: "€184k", icon: TrendingUp },
  { id: "revenue", value: "€96k", icon: Banknote },
  { id: "capacity", value: "82%", icon: Gauge },
  { id: "at-risk", value: "2", icon: AlertTriangle, tone: "warning" },
];
