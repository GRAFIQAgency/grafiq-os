"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DetailSection } from "@/components/shared/detail-section";
import { CURRENCIES } from "@/config/currencies";
import { useI18n } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/interpolate";

import { saveDealDetails } from "../actions";
import { STAGE_PROBABILITY } from "../constants";
import type { Deal, SalesPickers } from "../types";

/** Deal section: owner, value, probability, dates, next step, estimate link. One form, one Save. */
export function DealForm({ deal, pickers }: { deal: Deal; pickers: SalesPickers }) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.sales.detail;
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const d = deal.details;

  const selectCls = "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";
  const field = (name: string, label: string, input: React.ReactNode, hint?: string) => (
    <div>
      <Label htmlFor={name} className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      {input}
      {hint && !fieldErrors[name] ? <p className="mt-1 text-xs text-muted-foreground/70">{hint}</p> : null}
      {fieldErrors[name] ? <p className="mt-1 text-xs text-destructive">{fieldErrors[name]}</p> : null}
    </div>
  );

  function submit(form: HTMLFormElement) {
    const data = Object.fromEntries(new FormData(form).entries());
    start(async () => {
      const result = await saveDealDetails(deal.company.id, data);
      setFieldErrors(result.fieldErrors ?? {});
      setMessage(result.error ?? t.saved);
      if (!result.error) router.refresh();
    });
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(e.currentTarget); }}>
      <DetailSection title={t.deal}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-guide="sales-deal">
          {field("ownerId", t.owner, (
            <select id="ownerId" name="ownerId" defaultValue={d.ownerId ?? ""} className={selectCls}>
              <option value="">{dict.sales.unassigned}</option>
              {pickers.owners.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          ))}
          {field("pricingEstimateId", t.estimate, (
            <select id="pricingEstimateId" name="pricingEstimateId" defaultValue={d.pricingEstimateId ?? ""} className={selectCls}>
              <option value="">{t.noEstimate}</option>
              {pickers.estimates.map((e) => <option key={e.id} value={e.id}>{e.hint ? `${e.label} · ${e.hint}` : e.label}</option>)}
            </select>
          ), t.estimateHint)}
          <div className="grid grid-cols-[1fr_auto] gap-2">
            {field("dealValue", t.value, <Input id="dealValue" name="dealValue" type="number" min={0} step="any" defaultValue={d.dealValue ?? ""} className="text-right tabular-nums" aria-invalid={Boolean(fieldErrors.dealValue)} />, t.valueHint)}
            {field("dealCurrency", t.currency, (
              <select id="dealCurrency" name="dealCurrency" defaultValue={d.dealCurrency ?? ""} className={`${selectCls} w-24`}>
                <option value="">—</option>
                {CURRENCIES.map((cur) => <option key={cur} value={cur}>{cur}</option>)}
              </select>
            ))}
          </div>
          {field("probability", t.probability, <Input id="probability" name="probability" type="number" min={0} max={100} defaultValue={d.probability ?? ""} placeholder={String(STAGE_PROBABILITY[deal.stage])} className="text-right tabular-nums" aria-invalid={Boolean(fieldErrors.probability)} />,
            interpolate(t.probabilityHint, { n: STAGE_PROBABILITY[deal.stage] }))}
          {field("expectedClose", t.expectedClose, <Input id="expectedClose" name="expectedClose" type="date" defaultValue={d.expectedClose ?? ""} aria-invalid={Boolean(fieldErrors.expectedClose)} />)}
          {field("nextActionAt", t.nextActionAt, <Input id="nextActionAt" name="nextActionAt" type="date" defaultValue={d.nextActionAt ?? ""} aria-invalid={Boolean(fieldErrors.nextActionAt)} />, t.nextActionHint)}
          <div className="sm:col-span-2">
            {field("nextStep", t.nextStep, <Textarea id="nextStep" name="nextStep" rows={2} defaultValue={d.nextStep ?? ""} placeholder={t.nextStepPlaceholder} aria-invalid={Boolean(fieldErrors.nextStep)} />)}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" size="sm" disabled={pending} data-guide="sales-save">
            {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
            {pending ? t.saving : t.save}
          </Button>
          {message ? <span className={Object.keys(fieldErrors).length ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{message}</span> : null}
        </div>
      </DetailSection>
    </form>
  );
}
