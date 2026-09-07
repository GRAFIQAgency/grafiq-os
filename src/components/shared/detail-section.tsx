import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DetailSection({ title, children, className, action }: { title: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <Card className={cn("gap-4", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function Facts({ items, columns = 2 }: { items: { label: string; value: ReactNode }[]; columns?: 1 | 2 }) {
  return (
    <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-3 text-sm", columns === 2 && "sm:grid-cols-2")}>
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="text-right">{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
