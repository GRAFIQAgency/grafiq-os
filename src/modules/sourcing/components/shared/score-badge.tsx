import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number | null;
  /** Manual override, shown instead of the AI score when set. */
  manual?: number | null;
  highFrom: number;
  size?: "sm" | "lg";
  className?: string;
}

export function ScoreBadge({ score, manual, highFrom, size = "sm", className }: ScoreBadgeProps) {
  const value = manual ?? score;
  const tone =
    value === null || value === undefined
      ? "border-dashed text-muted-foreground"
      : value >= highFrom
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
        : value >= 60
          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
          : "border-border bg-muted/40 text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-semibold tabular-nums",
        size === "sm" ? "h-6 px-2 text-xs" : "h-9 px-3 text-lg",
        tone,
        className
      )}
      title={manual != null ? "manual override" : undefined}
    >
      {value ?? "—"}
      {manual != null ? <span className="text-[10px] font-normal opacity-70">M</span> : null}
    </span>
  );
}
