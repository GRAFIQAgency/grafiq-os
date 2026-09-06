import { EmptyPanel } from "@/components/shared/empty-panel";

import { placeholderStats } from "../data/placeholder";
import { StatsGrid } from "./stats-grid";

/** Composes the dashboard page. Data is placeholder-only for now. */
export function DashboardOverview() {
  return (
    <div className="space-y-6">
      <StatsGrid stats={placeholderStats} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <EmptyPanel
          className="lg:col-span-2"
          title="Recent activity"
          description="Project updates, approvals and handoffs will appear here once the Projects module is live."
        />
        <EmptyPanel
          title="Upcoming deadlines"
          description="Milestones due in the next 14 days, pulled from active projects."
        />
      </div>
    </div>
  );
}
