import { Badge } from "@/components/ui/badge";

interface PlaceholderBadgeProps {
  /** Translated label, e.g. dict.common.exampleData. */
  label: string;
}

/** Marks UI that shows example data or a not-yet-built feature. */
export function PlaceholderBadge({ label }: PlaceholderBadgeProps) {
  return (
    <Badge variant="outline" className="border-dashed text-muted-foreground">
      {label}
    </Badge>
  );
}
