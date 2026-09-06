"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getModule } from "@/config/modules";
import { useI18n } from "@/lib/i18n/client";
import type { MarginThresholds } from "@/modules/settings/types";

import { saveEstimate } from "../actions";
import { summarizeEstimate } from "../calculations";
import {
  createEmptyDraft,
  draftFromEstimate,
  draftToInput,
  newCostItemDraft,
  type CostItemDraft,
  type EstimateDraft,
} from "../draft";
import type { EstimateInput, PricingDefaults } from "../types";
import { CostItemsTable } from "./cost-items-table";
import { FinancialSummary } from "./financial-summary";
import { ProjectInfoForm } from "./project-info-form";

interface PricingCalculatorProps {
  /** When set, the calculator opens with a saved estimate loaded. */
  initialEstimate?: EstimateInput;
  /** Defaults for new estimates (currency, target margin, role presets) from Business Settings. */
  defaults: PricingDefaults;
  /** Health thresholds from Business Settings. */
  thresholds: MarginThresholds;
}

type SaveState = { status: "idle" } | { status: "saved" } | { status: "error"; message: string };

export function PricingCalculator({ initialEstimate, defaults, thresholds }: PricingCalculatorProps) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.pricing.toolbar;
  const [draft, setDraft] = useState<EstimateDraft>(() =>
    initialEstimate ? draftFromEstimate(initialEstimate) : createEmptyDraft(defaults)
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [isSaving, startSaving] = useTransition();

  const summary = useMemo(() => summarizeEstimate(draftToInput(draft), thresholds), [draft, thresholds]);

  function update(patch: Partial<EstimateDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
    if (saveState.status !== "idle") setSaveState({ status: "idle" });
  }

  function updateItem(key: string, patch: Partial<CostItemDraft>) {
    update({ items: draft.items.map((item) => (item.key === key ? { ...item, ...patch } : item)) });
  }

  function addItem() {
    update({ items: [...draft.items, newCostItemDraft()] });
  }

  function removeItem(key: string) {
    update({ items: draft.items.filter((item) => item.key !== key) });
  }

  function reset() {
    setDraft(createEmptyDraft(defaults));
    setFieldErrors({});
    setSaveState({ status: "idle" });
    if (draft.id) router.push(getModule("pricing").href);
  }

  function save() {
    startSaving(async () => {
      const result = await saveEstimate(draftToInput(draft));
      if (result.error) {
        setFieldErrors(result.fieldErrors ?? {});
        setSaveState({ status: "error", message: result.error });
        return;
      }
      setFieldErrors({});
      setDraft((prev) => ({ ...prev, id: result.id }));
      setSaveState({ status: "saved" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
          {saveState.status === "saved" ? t.saved : null}
          {saveState.status === "error" ? <span className="text-destructive">{saveState.message}</span> : null}
          {saveState.status === "idle" && draft.id ? t.editingSaved : null}
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={isSaving}>
            <RotateCcw data-icon="inline-start" />
            {t.reset}
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={isSaving} data-guide="pricing-save">
            {isSaving ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
            {draft.id ? t.update : t.save}
          </Button>
        </div>
      </div>

      <ProjectInfoForm
        value={{
          projectName: draft.projectName,
          clientName: draft.clientName,
          currency: draft.currency,
          revenue: draft.revenue,
          targetMargin: draft.targetMargin,
        }}
        onChange={update}
        fieldErrors={fieldErrors}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CostItemsTable
            items={draft.items}
            currency={draft.currency}
            rolePresets={defaults.rolePresets}
            directCosts={summary.directCosts}
            fieldErrors={fieldErrors}
            onAdd={addItem}
            onChange={updateItem}
            onRemove={removeItem}
          />
        </div>
        <FinancialSummary summary={summary} currency={draft.currency} thresholds={thresholds} />
      </div>
    </div>
  );
}
