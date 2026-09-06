import { cn } from "@/lib/utils";

/** Compact list of small labels (skills, technologies, tags). */
export function Chips({ items, max = 6, className }: { items: string[]; max?: number; className?: string }) {
  if (!items.length) return null;
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {shown.map((item) => (
        <span key={item} className="rounded bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">
          {item}
        </span>
      ))}
      {rest > 0 ? <span className="px-1 text-[11px] text-muted-foreground/70">+{rest}</span> : null}
    </div>
  );
}
