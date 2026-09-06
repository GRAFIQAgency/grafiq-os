import { EmptyPanel } from "@/components/shared/empty-panel";
import type { Dictionary } from "@/lib/i18n/config";

import { placeholderStats } from "../data/placeholder";
import type { DashboardStat } from "../types";
import { StatsGrid } from "./stats-grid";

interface DashboardOverviewProps {
  dict: Dictionary;
}

/** Composes the dashboard page. Data is placeholder-only for now. */
export function DashboardOverview({ dict }: DashboardOverviewProps) {
  const stats: DashboardStat[] = placeholderStats.map((seed) => ({
    ...seed,
    ...dict.dashboard.stats[seed.id],
  }));

  return (
    <div className="space-y-6">
      <StatsGrid stats={stats} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <EmptyPanel
          className="lg:col-span-2"
          title={dict.dashboard.recentActivity.title}
          description={dict.dashboard.recentActivity.description}
          emptyLabel={dict.common.nothingToShow}
        />
        <EmptyPanel
          title={dict.dashboard.upcomingDeadlines.title}
          description={dict.dashboard.upcomingDeadlines.description}
          emptyLabel={dict.common.nothingToShow}
        />
      </div>
    </div>
  );
}
