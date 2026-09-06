import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

import type { DashboardStat } from "../types";

interface StatCardProps {
  stat: DashboardStat;
}

export function StatCard({ stat }: StatCardProps) {
  const Icon = stat.icon;
  const warning = stat.tone === "warning";

  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground",
              warning && "border-amber-500/30 bg-amber-500/10 text-amber-400"
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-semibold tracking-tight tabular-nums">{stat.value}</p>
          <p className="text-xs text-muted-foreground">{stat.hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}
