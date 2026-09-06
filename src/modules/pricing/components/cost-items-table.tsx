"use client";

import { useId } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { COST_ROLE_PRESETS } from "../constants";
import type { CostItemDraft } from "../draft";
import { formatMoney } from "../format";
import type { Currency } from "../types";
import { CostItemRow } from "./cost-item-row";

interface CostItemsTableProps {
  items: CostItemDraft[];
  currency: Currency;
  directCosts: number;
  fieldErrors?: Record<string, string>;
  onAdd: () => void;
  onChange: (key: string, patch: Partial<CostItemDraft>) => void;
  onRemove: (key: string) => void;
}

export function CostItemsTable({
  items,
  currency,
  directCosts,
  fieldErrors,
  onAdd,
  onChange,
  onRemove,
}: CostItemsTableProps) {
  const presetsListId = useId();

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Direct costs</CardTitle>
        <CardDescription>Internal cost of delivering the project: hours × internal rate, or a fixed amount.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <datalist id={presetsListId}>
          {COST_ROLE_PRESETS.map((role) => (
            <option key={role} value={role} />
          ))}
        </datalist>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Role / cost</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Rate / amount</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-20 text-center text-sm text-muted-foreground">
                    No cost items yet. Add the roles needed to deliver this project.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => (
                  <CostItemRow
                    key={item.key}
                    item={item}
                    index={index}
                    currency={currency}
                    presetsListId={presetsListId}
                    fieldErrors={fieldErrors}
                    onChange={(patch) => onChange(item.key, patch)}
                    onRemove={() => onRemove(item.key)}
                  />
                ))
              )}
            </TableBody>
            <TableFooter>
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="text-sm font-medium">
                  Total direct costs
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatMoney(directCosts, currency)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus data-icon="inline-start" />
          Add cost
        </Button>
      </CardContent>
    </Card>
  );
}
