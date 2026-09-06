import { Badge } from "@/components/ui/badge";

/** Marks UI that shows example data or a not-yet-built feature. */
export function PlaceholderBadge({ label = "Example data" }: { label?: string }) {
  return (
    <Badge variant="outline" className="border-dashed text-muted-foreground">
      {label}
    </Badge>
  );
}
