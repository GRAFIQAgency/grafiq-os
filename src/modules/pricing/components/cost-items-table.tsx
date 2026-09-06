"use client";

import { useId } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/lib/i18n/client";

import { FALLBACK_ROLE_PRESETS } from "../constants";
import type { CostItemDraft } from "../draft";
import { formatMoney } from "../format";
import type { Currency, RolePreset } from "../types";
import { CostItemRow } from "./cost-item-row";

interface CostItemsTableProps {
  items: CostItemDraft[];
  currency: Currency;
  /** Active roles from Business Settings; falls back to static names when empty. */
  rolePresets: RolePreset[];
  directCosts: number;
  fieldErrors?: Record<string, string>;
  onAdd: () => void;
  onChange: (key: string, patch: Partial<CostItemDraft>) => void;
  onRemove: (key: string) => void;
}

export function CostItemsTable({
  items,
  currency,
  rolePresets,
  directCosts,
  fieldErrors,
  onAdd,
  onChange,
  onRemove,
}: CostItemsTableProps) {
  const presetsListId = useId();
  const { dict, locale } = useI18n();
  const t = dict.pricing.costs;
  const presetNames = rolePresets.length > 0 ? rolePresets.map((r) => r.name) : [...FALLBACK_ROLE_PRESETS];

  return (
    <Card className="gap-4" data-guide="pricing-costs">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <datalist id={presetsListId}>
          {presetNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t.role}</TableHead>
                <TableHead>{t.type}</TableHead>
                <TableHead className="text-right">{t.hours}</TableHead>
                <TableHead className="text-right">{t.rateOrAmount}</TableHead>
                <TableHead className="text-right">{t.total}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-20 text-center text-sm text-muted-foreground">
                    {t.empty}
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
                    rolePresets={rolePresets}
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
                  {t.totalDirect}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatMoney(directCosts, currency, locale)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus data-icon="inline-start" />
          {t.add}
        </Button>
      </CardContent>
    </Card>
  );
}
