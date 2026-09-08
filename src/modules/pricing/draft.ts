/**
 * Form-state helpers for the calculator (client side).
 * Numbers are kept as strings while editing so inputs behave naturally;
 * `draftToInput` parses them for calculations and saving.
 */
import type { CostItemInput, CostItemKind, Currency, EstimateInput, PricingBasis, PricingDefaults } from "./types";

export interface CostItemDraft {
  /** Client-only stable key for React lists. */
  key: string;
  name: string;
  kind: CostItemKind;
  hours: string;
  hourlyRate: string;
  fixedAmount: string;
  percent: string;
  quantity: string;
  unitCost: string;
  unitLabel: string;
}

export interface EstimateDraft {
  id?: string;
  projectName: string;
  clientName: string;
  currency: Currency;
  revenue: string;
  targetMargin: string;
  items: CostItemDraft[];
  pricingBasis: PricingBasis;
  unitCount: string;
  unitPrice: string;
  unitLabel: string;
}

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function newCostItemDraft(name = ""): CostItemDraft {
  return { key: newKey(), name, kind: "hourly", hours: "", hourlyRate: "", fixedAmount: "", percent: "", quantity: "", unitCost: "", unitLabel: "" };
}

export function createEmptyDraft(defaults: PricingDefaults): EstimateDraft {
  const first = defaults.rolePresets[0];
  const firstItem = first
    ? { ...newCostItemDraft(first.name), hourlyRate: numToText(first.hourlyCost) }
    : newCostItemDraft();
  return {
    projectName: "",
    clientName: "",
    currency: defaults.currency,
    revenue: "",
    targetMargin: String(defaults.targetMargin),
    items: [firstItem],
    pricingBasis: "total",
    unitCount: "",
    unitPrice: "",
    unitLabel: "",
  };
}

function numToText(n: number): string {
  return n === 0 ? "" : String(n);
}

export function draftFromEstimate(estimate: EstimateInput): EstimateDraft {
  return {
    id: estimate.id,
    projectName: estimate.projectName,
    clientName: estimate.clientName,
    currency: estimate.currency,
    revenue: numToText(estimate.revenue),
    targetMargin: String(estimate.targetMargin),
    items: estimate.items.map((item) => ({
      key: newKey(),
      name: item.name,
      kind: item.kind,
      hours: numToText(item.hours),
      hourlyRate: numToText(item.hourlyRate),
      fixedAmount: numToText(item.fixedAmount),
      percent: numToText(item.percent),
      quantity: numToText(item.quantity),
      unitCost: numToText(item.unitCost),
      unitLabel: item.unitLabel ?? "",
    })),
    pricingBasis: estimate.pricingBasis,
    unitCount: numToText(estimate.unitCount ?? 0),
    unitPrice: numToText(estimate.unitPrice ?? 0),
    unitLabel: estimate.unitLabel ?? "",
  };
}

function parseNumber(text: string): number {
  const n = Number(text.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function costItemDraftToInput(item: CostItemDraft): CostItemInput {
  return {
    name: item.name.trim(),
    kind: item.kind,
    hours: parseNumber(item.hours),
    hourlyRate: parseNumber(item.hourlyRate),
    fixedAmount: parseNumber(item.fixedAmount),
    percent: parseNumber(item.percent),
    quantity: parseNumber(item.quantity),
    unitCost: parseNumber(item.unitCost),
    unitLabel: item.unitLabel.trim() || null,
  };
}

export function draftToInput(draft: EstimateDraft): EstimateInput {
  return {
    id: draft.id,
    projectName: draft.projectName.trim(),
    clientName: draft.clientName.trim(),
    currency: draft.currency,
    revenue: parseNumber(draft.revenue),
    targetMargin: parseNumber(draft.targetMargin),
    items: draft.items.map(costItemDraftToInput),
    pricingBasis: draft.pricingBasis,
    unitCount: draft.pricingBasis === "per_unit" ? parseNumber(draft.unitCount) : null,
    unitPrice: draft.pricingBasis === "per_unit" ? parseNumber(draft.unitPrice) : null,
    unitLabel: draft.unitLabel.trim() || null,
  };
}
