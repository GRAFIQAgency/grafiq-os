import type { DashboardStat } from "../types";
import { StatCard } from "./stat-card";

interface StatsGridProps {
  stats: readonly DashboardStat[];
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {stats.map((stat) => (
        <StatCard key={stat.id} stat={stat} />
      ))}
    </div>
  );
}
