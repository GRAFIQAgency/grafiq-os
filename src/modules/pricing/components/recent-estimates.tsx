import Link from "next/link";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getModule } from "@/config/modules";

import { formatDate, formatMoney, formatPercent } from "../format";
import type { EstimateListItem } from "../types";
import { HealthBadge } from "./health-badge";

interface RecentEstimatesProps {
  items: EstimateListItem[];
  activeId?: string;
}

export function RecentEstimates({ items, activeId }: RecentEstimatesProps) {
  const basePath = getModule("pricing").href;

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Recent estimates</CardTitle>
        <CardDescription>Open a saved estimate to load it back into the calculator.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            No saved estimates yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className={cn(item.id === activeId && "bg-muted/40")}>
                    <TableCell className="font-medium">
                      <Link
                        href={`${basePath}?estimate=${item.id}`}
                        className="after:absolute after:inset-0 hover:underline"
                      >
                        {item.projectName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.clientName || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(item.revenue, item.currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPercent(item.grossMargin)}</TableCell>
                    <TableCell>
                      <HealthBadge status={item.health} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatDate(item.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
