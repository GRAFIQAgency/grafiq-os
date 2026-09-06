import { AlertTriangle, Banknote, FolderKanban, Gauge, TrendingUp } from "lucide-react";

import type { DashboardStat } from "../types";

/**
 * PLACEHOLDER DATA — not connected to any real source.
 * Replace with real queries in `src/modules/dashboard/queries.ts` when the
 * Projects, Sales, Finance and Capacity modules exist.
 */
export const placeholderStats: readonly DashboardStat[] = [
  {
    id: "active-projects",
    label: "Active Projects",
    value: "12",
    hint: "3 starting this week",
    icon: FolderKanban,
  },
  {
    id: "pipeline",
    label: "Pipeline",
    value: "€184k",
    hint: "8 open proposals",
    icon: TrendingUp,
  },
  {
    id: "revenue",
    label: "Revenue",
    value: "€96k",
    hint: "Month to date",
    icon: Banknote,
  },
  {
    id: "capacity",
    label: "Capacity",
    value: "82%",
    hint: "Team utilisation this week",
    icon: Gauge,
  },
  {
    id: "at-risk",
    label: "Projects At Risk",
    value: "2",
    hint: "Behind schedule or over budget",
    icon: AlertTriangle,
    tone: "warning",
  },
];
