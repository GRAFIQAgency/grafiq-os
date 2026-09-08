import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** One number with a label. `tone` red is reserved for genuine financial risk. */
export function StatCard({ label, value, hint, tone = "default", className }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "risk" | "positive" | "muted"; className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card px-4 py-3", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-lg font-semibold tabular-nums", tone === "risk" && "text-red-400", tone === "positive" && "text-emerald-400", tone === "muted" && "text-muted-foreground")}>{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
