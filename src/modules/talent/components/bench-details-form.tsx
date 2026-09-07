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

import { saveBenchDetails } from "../actions";
import { BENCH_STATUSES, ENGAGEMENT_TYPES } from "../constants";
import type { TalentPerson } from "../types";

/** Availability + Commercial sections: one form, one Save. */
export function BenchDetailsForm({ person }: { person: TalentPerson }) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.talent.detail;
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const c = person.candidate;
  const d = person.details;

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
      const result = await saveBenchDetails(c.id, data);
      setFieldErrors(result.fieldErrors ?? {});
      setMessage(result.error ?? t.saved);
      if (!result.error) router.refresh();
    });
  }

  const sourcingRate = c.hourlyRateMin != null || c.hourlyRateMax != null ? `${c.hourlyRateMin ?? "?"}–${c.hourlyRateMax ?? "?"} ${c.rateCurrency ?? ""}${t.perHour}` : null;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
    >
      <DetailSection title={t.availability} className="[&]:scroll-mt-20">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-guide="talent-availability">
          {field("benchStatus", t.benchStatus, (
            <select id="benchStatus" name="benchStatus" defaultValue={d.benchStatus} className={selectCls}>
              {BENCH_STATUSES.map((s) => <option key={s} value={s}>{dict.talent.statuses[s]}</option>)}
            </select>
          ))}
          {field("availability", t.currentAvailability, (
            <select id="availability" name="availability" defaultValue={c.availability ?? "unknown"} className={selectCls}>
              {(["available", "limited", "unavailable", "unknown"] as const).map((a) => <option key={a} value={a}>{dict.talent.availabilities[a]}</option>)}
            </select>
          ))}
          {field("availableFrom", t.availableFrom, <Input id="availableFrom" name="availableFrom" type="date" defaultValue={d.availableFrom ?? ""} aria-invalid={Boolean(fieldErrors.availableFrom)} />)}
          {field("maxMonthlyHours", t.maxMonthlyHours, <Input id="maxMonthlyHours" name="maxMonthlyHours" type="number" min={0} max={744} defaultValue={d.maxMonthlyHours ?? ""} className="text-right tabular-nums" aria-invalid={Boolean(fieldErrors.maxMonthlyHours)} />)}
          {field("preferredMonthlyHours", t.preferredMonthlyHours, <Input id="preferredMonthlyHours" name="preferredMonthlyHours" type="number" min={0} max={744} defaultValue={d.preferredMonthlyHours ?? ""} className="text-right tabular-nums" aria-invalid={Boolean(fieldErrors.preferredMonthlyHours)} />)}
        </div>
      </DetailSection>

      <DetailSection title={t.commercial}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-guide="talent-commercial">
          {field("engagementType", t.engagementType, (
            <select id="engagementType" name="engagementType" defaultValue={d.engagementType ?? ""} className={selectCls}>
              <option value="">{t.unknown}</option>
              {ENGAGEMENT_TYPES.map((e) => <option key={e} value={e}>{dict.talent.engagements[e]}</option>)}
            </select>
          ))}
          <div className="grid grid-cols-[1fr_auto] gap-2">
            {field("hourlyCost", t.hourlyCost, <Input id="hourlyCost" name="hourlyCost" type="number" min={0} step="any" defaultValue={d.hourlyCost ?? ""} className="text-right tabular-nums" aria-invalid={Boolean(fieldErrors.hourlyCost)} />,
              d.hourlyCost == null ? (sourcingRate ? interpolate(t.sourcingRate, { rate: sourcingRate }) : t.fallbackHint) : undefined)}
            {field("costCurrency", t.currency, (
              <select id="costCurrency" name="costCurrency" defaultValue={d.costCurrency ?? c.rateCurrency ?? ""} className={`${selectCls} w-24`}>
                <option value="">{t.unknown}</option>
                {CURRENCIES.map((cur) => <option key={cur} value={cur}>{cur}</option>)}
              </select>
            ))}
          </div>
          {field("dayRate", t.dayRate, <Input id="dayRate" name="dayRate" type="number" min={0} step="any" defaultValue={d.dayRate ?? ""} className="text-right tabular-nums" aria-invalid={Boolean(fieldErrors.dayRate)} />)}
          {field("minimumEngagement", t.minimumEngagement, <Input id="minimumEngagement" name="minimumEngagement" defaultValue={d.minimumEngagement ?? ""} placeholder="e.g. 2 days" />)}
          <div className="sm:col-span-2">
            {field("commercialNotes", t.commercialNotes, <Textarea id="commercialNotes" name="commercialNotes" rows={3} defaultValue={d.commercialNotes ?? ""} aria-invalid={Boolean(fieldErrors.commercialNotes)} />)}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" size="sm" disabled={pending} data-guide="talent-save">
            {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
            {pending ? t.saving : t.save}
          </Button>
          {message ? <span className={Object.keys(fieldErrors).length ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{message}</span> : null}
        </div>
      </DetailSection>
    </form>
  );
}
