"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { useI18n } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/interpolate";

import { costItemTotal } from "../calculations";
import { costItemDraftToInput, type CostItemDraft } from "../draft";
import { formatMoney } from "../format";
import { resolvePreset } from "../presets";
import type { CostItemKind, Currency, PersonPreset, RolePreset } from "../types";

interface CostItemRowProps {
  item: CostItemDraft;
  index: number;
  currency: Currency;
  /** Client price — percent lines are a share of it. */
  revenue: number;
  presetsListId: string;
  rolePresets: RolePreset[];
  peoplePresets: PersonPreset[];
  fieldErrors?: Record<string, string>;
  onChange: (patch: Partial<CostItemDraft>) => void;
  onRemove: () => void;
}

const KINDS: CostItemKind[] = ["hourly", "fixed", "percent"];

export function CostItemRow({
  item,
  index,
  currency,
  revenue,
  presetsListId,
  rolePresets,
  peoplePresets,
  fieldErrors = {},
  onChange,
  onRemove,
}: CostItemRowProps) {
  const { dict, locale } = useI18n();
  const t = dict.pricing.costs;
  const n = index + 1;
  const total = costItemTotal(costItemDraftToInput(item), revenue);
  const errorFor = (field: string) => fieldErrors[`items.${index}.${field}`];
  const match = resolvePreset(item.name, peoplePresets, rolePresets, currency);

  /**
   * Picking a person (Talent Bench) or a role (Settings) sets the pay model
   * and pre-fills the matching value: the person's own rate / fixed price /
   * percent wins, else the role default. Only fills while the value is still
   * empty, so a manually typed number is never overwritten.
   */
  function changeName(name: string) {
    const preset = resolvePreset(name, peoplePresets, rolePresets, currency);
    if (!preset) {
      onChange({ name });
      return;
    }
    const patch: Partial<CostItemDraft> = { name: preset.name, kind: preset.payModel };
    if (preset.payModel === "hourly" && item.hourlyRate === "" && preset.hourlyCost != null) patch.hourlyRate = String(preset.hourlyCost);
    if (preset.payModel === "fixed" && item.fixedAmount === "" && preset.fixedPrice != null) patch.fixedAmount = String(preset.fixedPrice);
    if (preset.payModel === "percent" && item.percent === "" && preset.percent != null) patch.percent = String(preset.percent);
    onChange(patch);
  }

  const numberInput = (field: "hours" | "hourlyRate" | "fixedAmount" | "percent", label: string, placeholder: string, extra?: React.ReactNode) => (
    <div className="relative">
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        max={field === "percent" ? 100 : undefined}
        step="any"
        value={item[field]}
        onChange={(e) => onChange({ [field]: e.target.value })}
        placeholder={placeholder}
        aria-label={label}
        aria-invalid={Boolean(errorFor(field))}
        className={field === "hours" ? "w-24 text-right tabular-nums" : "w-36 pr-7 text-right tabular-nums"}
      />
      {extra}
    </div>
  );
  const suffix = (text: string) => (
    <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">{text}</span>
  );

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="min-w-44">
        <Input
          list={presetsListId}
          value={item.name}
          onChange={(e) => changeName(e.target.value)}
          placeholder={t.namePlaceholder}
          aria-label={interpolate(t.costName, { n })}
          aria-invalid={Boolean(errorFor("name"))}
        />
        {match?.kind === "person" ? (
          <p className="mt-1 text-[11px] text-muted-foreground">{match.role ?? t.person}</p>
        ) : null}
      </TableCell>
      <TableCell>
        <Select value={item.kind} onValueChange={(kind) => onChange({ kind: kind as CostItemKind })}>
          <SelectTrigger aria-label={interpolate(t.costType, { n })} className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => <SelectItem key={k} value={k}>{t[k]}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        {item.kind === "hourly" ? (
          numberInput("hours", interpolate(t.costHours, { n }), "0")
        ) : (
          <span className="block text-center text-xs text-muted-foreground/60" title={item.kind === "fixed" ? t.noHoursHint : t.noHoursPercentHint}>—</span>
        )}
      </TableCell>
      <TableCell>
        {item.kind === "fixed"
          ? numberInput("fixedAmount", interpolate(t.costAmount, { n }), t.perProjectPlaceholder, suffix(currency))
          : item.kind === "percent"
            ? numberInput("percent", interpolate(t.costPercent, { n }), "0", suffix("%"))
            : numberInput("hourlyRate", interpolate(t.costRate, { n }), t.perHourPlaceholder, suffix(`${currency}/h`))}
      </TableCell>
      <TableCell className="text-right font-medium tabular-nums">
        {formatMoney(total, currency, locale)}
        {item.kind === "percent" && revenue <= 0 ? <span className="block text-[11px] font-normal text-muted-foreground">{t.percentNeedsPrice}</span> : null}
      </TableCell>
      <TableCell className="w-10 pr-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label={interpolate(t.remove, { n })}
          className="text-muted-foreground hover:text-foreground"
        >
          <X />
        </Button>
      </TableCell>
    </TableRow>
  );
}
