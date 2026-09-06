import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface EmptyPanelProps {
  title: string;
  description: string;
  /** Translated text for the empty area, e.g. dict.common.nothingToShow. */
  emptyLabel: string;
  className?: string;
}

/** A card with a title and a dashed empty area — used for not-yet-built widgets. */
export function EmptyPanel({ title, description, emptyLabel, className }: EmptyPanelProps) {
  return (
    <Card className={cn("gap-4", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
          {emptyLabel}
        </div>
      </CardContent>
    </Card>
  );
}
