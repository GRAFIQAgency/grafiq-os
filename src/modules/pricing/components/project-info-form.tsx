"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

import { CURRENCIES } from "../constants";
import type { EstimateDraft } from "../draft";
import { formatMoney } from "../format";
import type { Currency, PricingBasis } from "../types";

type ProjectInfoFields = Pick<
  EstimateDraft,
  "projectName" | "clientName" | "currency" | "revenue" | "targetMargin" | "pricingBasis" | "unitCount" | "unitPrice" | "unitLabel"
>;

interface ProjectInfoFormProps {
  value: ProjectInfoFields;
  onChange: (patch: Partial<ProjectInfoFields>) => void;
  fieldErrors?: Record<string, string>;
}

const parse = (s: string) => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/** Project info + the price. The price is typed as a total, or derived per unit (count × unit price). */
export function ProjectInfoForm({ value, onChange, fieldErrors = {} }: ProjectInfoFormProps) {
  const { dict, locale } = useI18n();
  const t = dict.pricing.project;
  const perUnit = value.pricingBasis === "per_unit";
  const derivedTotal = parse(value.unitCount) * parse(value.unitPrice);

  return (
    <Card data-guide="pricing-project">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-6">
        <Field label={t.projectName} htmlFor="projectName" error={fieldErrors.projectName} className="xl:col-span-2">
          <Input
            id="projectName"
            value={value.projectName}
            onChange={(e) => onChange({ projectName: e.target.value })}
            placeholder={t.projectNamePlaceholder}
            aria-invalid={Boolean(fieldErrors.projectName)}
          />
        </Field>

        <Field label={t.client} htmlFor="clientName" error={fieldErrors.clientName} hint={dict.common.optional}>
          <Input
            id="clientName"
            value={value.clientName}
            onChange={(e) => onChange({ clientName: e.target.value })}
            placeholder={t.clientPlaceholder}
          />
        </Field>

        <Field label={t.basis} htmlFor="pricingBasis" hint={t.basisHint} className="[&]:scroll-mt-20">
          <div className="flex items-center gap-1 rounded-md border p-0.5" data-guide="pricing-basis" role="radiogroup" aria-label={t.basis}>
            {(["total", "per_unit"] as PricingBasis[]).map((b) => (
              <button
                key={b}
                type="button"
                role="radio"
                aria-checked={value.pricingBasis === b}
                onClick={() => onChange({ pricingBasis: b })}
                className={cn("h-7 flex-1 rounded-sm px-2 text-xs font-medium transition-colors", value.pricingBasis === b ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {b === "total" ? t.basisTotal : t.basisPerUnit}
              </button>
            ))}
          </div>
        </Field>

        {perUnit ? (
          <Field label={t.unitCount} htmlFor="unitCount" error={fieldErrors.unitCount}>
            <div className="flex gap-2">
              <Input id="unitCount" type="number" inputMode="decimal" min={0} step="any" value={value.unitCount} onChange={(e) => onChange({ unitCount: e.target.value })} placeholder="0" className="text-right tabular-nums" aria-invalid={Boolean(fieldErrors.unitCount)} />
              <Input id="unitLabel" value={value.unitLabel} onChange={(e) => onChange({ unitLabel: e.target.value })} placeholder={t.unitLabelPlaceholder} aria-label={t.unitLabel} className="w-20 shrink-0" maxLength={30} />
            </div>
          </Field>
        ) : null}

        <Field label={perUnit ? t.unitPrice : t.price} htmlFor={perUnit ? "unitPrice" : "revenue"} error={fieldErrors.revenue ?? fieldErrors.currency} hint={perUnit ? formatMoney(derivedTotal, value.currency, locale) + " " + t.derivedTotal : undefined}>
          <div className="flex gap-2">
            {perUnit ? (
              <Input
                id="unitPrice"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={value.unitPrice}
                onChange={(e) => onChange({ unitPrice: e.target.value })}
                placeholder="0"
                className="text-right tabular-nums"
              />
            ) : (
              <Input
                id="revenue"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={value.revenue}
                onChange={(e) => onChange({ revenue: e.target.value })}
                placeholder="0"
                className="text-right tabular-nums"
                aria-invalid={Boolean(fieldErrors.revenue)}
              />
            )}
            <Select value={value.currency} onValueChange={(c) => onChange({ currency: c as Currency })}>
              <SelectTrigger aria-label={t.currency} className="w-24 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Field>

        <Field label={t.targetMargin} htmlFor="targetMargin" error={fieldErrors.targetMargin}>
          <div className="relative">
            <Input
              id="targetMargin"
              type="number"
              inputMode="decimal"
              min={0}
              max={99.99}
              step="any"
              value={value.targetMargin}
              onChange={(e) => onChange({ targetMargin: e.target.value })}
              className="pr-8 text-right tabular-nums"
              aria-invalid={Boolean(fieldErrors.targetMargin)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
              %
            </span>
          </div>
        </Field>
      </CardContent>
    </Card>
  );
}

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

function Field({ label, htmlFor, hint, error, className, children }: FieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="mb-2 flex items-baseline gap-1.5">
        {label}
        {hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}
      </Label>
      {children}
      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
