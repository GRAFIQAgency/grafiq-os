"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";

import { costItemTotal } from "../calculations";
import { costItemDraftToInput, type CostItemDraft } from "../draft";
import { formatMoney } from "../format";
import type { CostItemKind, Currency } from "../types";

interface CostItemRowProps {
  item: CostItemDraft;
  index: number;
  currency: Currency;
  presetsListId: string;
  fieldErrors?: Record<string, string>;
  onChange: (patch: Partial<CostItemDraft>) => void;
  onRemove: () => void;
}

export function CostItemRow({
  item,
  index,
  currency,
  presetsListId,
  fieldErrors = {},
  onChange,
  onRemove,
}: CostItemRowProps) {
  const total = costItemTotal(costItemDraftToInput(item));
  const isFixed = item.kind === "fixed";
  const errorFor = (field: string) => fieldErrors[`items.${index}.${field}`];

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="min-w-44">
        <Input
          list={presetsListId}
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Role or cost name"
          aria-label={`Cost ${index + 1} name`}
          aria-invalid={Boolean(errorFor("name"))}
        />
      </TableCell>
      <TableCell>
        <Select value={item.kind} onValueChange={(kind) => onChange({ kind: kind as CostItemKind })}>
          <SelectTrigger aria-label={`Cost ${index + 1} type`} className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hourly">Hourly</SelectItem>
            <SelectItem value="fixed">Fixed</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        {isFixed ? (
          <span className="block text-center text-muted-foreground/50">—</span>
        ) : (
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={item.hours}
            onChange={(e) => onChange({ hours: e.target.value })}
            placeholder="0"
            aria-label={`Cost ${index + 1} hours`}
            className="w-24 text-right tabular-nums"
          />
        )}
      </TableCell>
      <TableCell>
        {isFixed ? (
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={item.fixedAmount}
            onChange={(e) => onChange({ fixedAmount: e.target.value })}
            placeholder="0"
            aria-label={`Cost ${index + 1} fixed amount`}
            className="w-32 text-right tabular-nums"
          />
        ) : (
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={item.hourlyRate}
            onChange={(e) => onChange({ hourlyRate: e.target.value })}
            placeholder="0"
            aria-label={`Cost ${index + 1} hourly cost`}
            className="w-32 text-right tabular-nums"
          />
        )}
      </TableCell>
      <TableCell className="text-right font-medium tabular-nums">{formatMoney(total, currency)}</TableCell>
      <TableCell className="w-10 pr-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label={`Remove cost ${index + 1}`}
          className="text-muted-foreground hover:text-foreground"
        >
          <X />
        </Button>
      </TableCell>
    </TableRow>
  );
}
