import { cn } from "@/lib/utils";

/** Compact 1–10 rating: number + a five-segment bar. */
export function RatingDots({ value, label }: { value: number | undefined; label: string }) {
  if (value == null) return <span className="text-xs text-muted-foreground/60" aria-label={label}>—</span>;
  const filled = Math.round(value / 2);
  const tone = value >= 8 ? "bg-emerald-400" : value >= 5 ? "bg-amber-400" : "bg-red-400";
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums" aria-label={`${label}: ${value}/10`}>
      <span className="text-xs font-medium">{value}</span>
      <span className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={cn("h-1.5 w-2 rounded-sm", i < filled ? tone : "bg-muted")} />
        ))}
      </span>
    </span>
  );
}
