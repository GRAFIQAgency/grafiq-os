import Link from "next/link";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getModule } from "@/config/modules";
import { getDictionary, getLocale } from "@/lib/i18n/server";

import { formatDate, formatMoney, formatPercent } from "../format";
import type { EstimateListItem } from "../types";
import { HealthBadge } from "./health-badge";

interface RecentEstimatesProps {
  items: EstimateListItem[];
  activeId?: string;
}

export async function RecentEstimates({ items, activeId }: RecentEstimatesProps) {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const t = dict.pricing.recent;
  const basePath = getModule("pricing").href;

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            {t.empty}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t.project}</TableHead>
                  <TableHead>{t.client}</TableHead>
                  <TableHead className="text-right">{t.revenue}</TableHead>
                  <TableHead className="text-right">{t.margin}</TableHead>
                  <TableHead>{t.status}</TableHead>
                  <TableHead className="text-right">{t.created}</TableHead>
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
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(item.revenue, item.currency, locale)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPercent(item.grossMargin, locale)}
                    </TableCell>
                    <TableCell>
                      <HealthBadge status={item.health} text={dict.pricing.health} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDate(item.createdAt, locale)}
                    </TableCell>
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
