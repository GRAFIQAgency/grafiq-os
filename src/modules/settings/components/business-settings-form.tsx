"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES } from "@/config/currencies";
import { useI18n } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/interpolate";
import type { Currency } from "@/types/database";

import { saveBusinessSettings } from "../actions";
import { sumPaymentTerms } from "../services";
import type { BusinessSettings } from "../types";
import { PercentInputWrap, SettingsField } from "./settings-field";

interface BusinessSettingsFormProps {
  initial: BusinessSettings;
  /** False when the settings row does not exist yet (defaults shown). */
  persisted: boolean;
}

/** Form state keeps numbers as strings so inputs behave naturally. */
interface SettingsDraft {
  companyName: string;
  defaultCurrency: Currency;
  vatRate: string;
  targetMargin: string;
  warningMargin: string;
  minimumMargin: string;
  paymentTerms: string[];
}

type SaveState = { status: "idle" } | { status: "saved" } | { status: "error"; message: string };

function toDraft(s: BusinessSettings): SettingsDraft {
  return {
    companyName: s.companyName,
    defaultCurrency: s.defaultCurrency,
    vatRate: String(s.vatRate),
    targetMargin: String(s.targetMargin),
    warningMargin: String(s.warningMargin),
    minimumMargin: String(s.minimumMargin),
    paymentTerms: s.paymentTerms.map(String),
  };
}

function parseTerm(text: string): number {
  const n = Number(text.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function BusinessSettingsForm({ initial, persisted }: BusinessSettingsFormProps) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.settings;
  const [draft, setDraft] = useState<SettingsDraft>(() => toDraft(initial));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [isSaving, startSaving] = useTransition();

  const termsTotal = sumPaymentTerms(draft.paymentTerms.map(parseTerm));
  const termsOk = termsTotal === 100;

  function update(patch: Partial<SettingsDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
    if (saveState.status !== "idle") setSaveState({ status: "idle" });
  }

  function updateTerm(index: number, value: string) {
    update({ paymentTerms: draft.paymentTerms.map((term, i) => (i === index ? value : term)) });
  }

  function save() {
    startSaving(async () => {
      const result = await saveBusinessSettings({
        ...draft,
        paymentTerms: draft.paymentTerms.map(parseTerm),
      });
      if (result.error) {
        setFieldErrors(result.fieldErrors ?? {});
        setSaveState({ status: "error", message: result.error });
        return;
      }
      setFieldErrors({});
      setSaveState({ status: "saved" });
      router.refresh();
    });
  }

  const percentInput = (id: keyof SettingsDraft, label: string, hint?: string, max = 99.99) => (
    <SettingsField label={label} htmlFor={id} hint={hint} error={fieldErrors[id]}>
      <PercentInputWrap>
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          max={max}
          step="any"
          value={draft[id] as string}
          onChange={(e) => update({ [id]: e.target.value } as Partial<SettingsDraft>)}
          className="pr-8 text-right tabular-nums"
          aria-invalid={Boolean(fieldErrors[id])}
        />
      </PercentInputWrap>
    </SettingsField>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
          {saveState.status === "saved" ? t.business.saved : null}
          {saveState.status === "error" ? <span className="text-destructive">{saveState.message}</span> : null}
          {saveState.status === "idle" && !persisted ? t.business.usingDefaults : null}
        </p>
        <Button type="button" size="sm" onClick={save} disabled={isSaving}>
          {isSaving ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
          {t.business.saveChanges}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.company.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SettingsField label={t.company.companyName} htmlFor="companyName" error={fieldErrors.companyName} className="xl:col-span-2">
            <Input
              id="companyName"
              value={draft.companyName}
              onChange={(e) => update({ companyName: e.target.value })}
              aria-invalid={Boolean(fieldErrors.companyName)}
            />
          </SettingsField>
          <SettingsField label={t.company.defaultCurrency} htmlFor="defaultCurrency" error={fieldErrors.defaultCurrency}>
            <Select value={draft.defaultCurrency} onValueChange={(c) => update({ defaultCurrency: c as Currency })}>
              <SelectTrigger id="defaultCurrency" className="w-full">
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
          </SettingsField>
          {percentInput("vatRate", t.company.vatRate, undefined, 100)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.economics.title}</CardTitle>
          <CardDescription>{t.economics.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {percentInput("targetMargin", t.economics.targetMargin)}
            {percentInput("warningMargin", t.economics.warningMargin)}
            {percentInput("minimumMargin", t.economics.minimumMargin, t.economics.minimumHint)}
          </div>
          {fieldErrors.marginOrder ? <p className="text-xs text-destructive">{fieldErrors.marginOrder}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.paymentTerms.title}</CardTitle>
          <CardDescription>{t.paymentTerms.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            {draft.paymentTerms.map((term, index) => {
              const n = index + 1;
              const id = `paymentTerm-${index}`;
              return (
                <SettingsField
                  key={index}
                  label={interpolate(t.paymentTerms.milestone, { n })}
                  htmlFor={id}
                  error={fieldErrors[`paymentTerms.${index}`]}
                  className="w-36"
                >
                  <div className="flex items-center gap-1">
                    <PercentInputWrap>
                      <Input
                        id={id}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={100}
                        step="any"
                        value={term}
                        onChange={(e) => updateTerm(index, e.target.value)}
                        className="pr-8 text-right tabular-nums"
                      />
                    </PercentInputWrap>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => update({ paymentTerms: draft.paymentTerms.filter((_, i) => i !== index) })}
                      aria-label={interpolate(t.paymentTerms.remove, { n })}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X />
                    </Button>
                  </div>
                </SettingsField>
              );
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mb-0.5"
              onClick={() => update({ paymentTerms: [...draft.paymentTerms, ""] })}
            >
              <Plus data-icon="inline-start" />
              {t.paymentTerms.add}
            </Button>
          </div>
          <p className={cn("text-sm tabular-nums", termsOk ? "text-muted-foreground" : "text-amber-400")}>
            {t.paymentTerms.total}: {termsTotal} %
          </p>
          {fieldErrors.paymentTerms ? <p className="text-xs text-destructive">{fieldErrors.paymentTerms}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
