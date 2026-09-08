import { interpolate } from "@/lib/i18n/interpolate";

import { CURRENCIES } from "./constants";
import type { CostItemInput, EstimateInput, SaveEstimateResult } from "./types";

type ValidationOutcome =
  | { data: EstimateInput; errors?: undefined }
  | { data?: undefined; errors: SaveEstimateResult };

/** Translated messages (dict.pricing.validation). Passed in to keep this file pure. */
export interface EstimateValidationMessages {
  invalidPayload: string;
  fixFields: string;
  projectNameRequired: string;
  maxLength: string;
  currency: string;
  revenue: string;
  targetMargin: string;
  itemName: string;
  itemKind: string;
  itemHours: string;
  itemRate: string;
  itemAmount: string;
  itemPercent: string;
  itemQuantity: string;
  unitFields: string;
}

const MAX_NAME = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNonNegativeNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Validates untrusted input (from the client) into a well-typed EstimateInput.
 * Dependency-free on purpose; swap for zod if forms grow more complex.
 */
export function validateEstimateInput(
  raw: unknown,
  msg: EstimateValidationMessages
): ValidationOutcome {
  const fieldErrors: Record<string, string> = {};
  if (!isRecord(raw)) return { errors: { error: msg.invalidPayload } };

  const maxLength = interpolate(msg.maxLength, { max: MAX_NAME });

  const projectName = asText(raw.projectName);
  if (!projectName) fieldErrors.projectName = msg.projectNameRequired;
  else if (projectName.length > MAX_NAME) fieldErrors.projectName = maxLength;

  const clientName = asText(raw.clientName);
  if (clientName.length > MAX_NAME) fieldErrors.clientName = maxLength;

  const currency = CURRENCIES.find((c) => c === raw.currency);
  if (!currency) fieldErrors.currency = msg.currency;

  const revenue = asNonNegativeNumber(raw.revenue);
  if (revenue === null) fieldErrors.revenue = msg.revenue;

  const targetMargin = asNonNegativeNumber(raw.targetMargin);
  if (targetMargin === null || targetMargin >= 100) fieldErrors.targetMargin = msg.targetMargin;

  const pricingBasis = raw.pricingBasis === "per_unit" ? "per_unit" : "total";
  const unitCount = pricingBasis === "per_unit" ? asNonNegativeNumber(raw.unitCount ?? 0) : null;
  const unitPrice = pricingBasis === "per_unit" ? asNonNegativeNumber(raw.unitPrice ?? 0) : null;
  if (pricingBasis === "per_unit" && (unitCount === null || unitPrice === null)) fieldErrors.unitCount = msg.unitFields;
  const unitLabel = asText(raw.unitLabel).slice(0, 30) || null;

  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const items: CostItemInput[] = [];
  rawItems.forEach((item, index) => {
    if (!isRecord(item)) return;
    const name = asText(item.name);
    const kind = item.kind === "fixed" ? "fixed" : item.kind === "hourly" ? "hourly" : item.kind === "percent" ? "percent" : item.kind === "unit" ? "unit" : null;
    const quantity = asNonNegativeNumber(item.quantity ?? 0);
    const unitCost = asNonNegativeNumber(item.unitCost ?? 0);
    if (quantity === null) fieldErrors[`items.${index}.quantity`] = msg.itemQuantity;
    if (unitCost === null) fieldErrors[`items.${index}.unitCost`] = msg.itemAmount;
    const hours = asNonNegativeNumber(item.hours ?? 0);
    const hourlyRate = asNonNegativeNumber(item.hourlyRate ?? 0);
    const fixedAmount = asNonNegativeNumber(item.fixedAmount ?? 0);
    const percentRaw = asNonNegativeNumber(item.percent ?? 0);
    const percent = percentRaw !== null && percentRaw <= 100 ? percentRaw : null;

    if (!name) fieldErrors[`items.${index}.name`] = msg.itemName;
    if (!kind) fieldErrors[`items.${index}.kind`] = msg.itemKind;
    if (hours === null) fieldErrors[`items.${index}.hours`] = msg.itemHours;
    if (hourlyRate === null) fieldErrors[`items.${index}.hourlyRate`] = msg.itemRate;
    if (fixedAmount === null) fieldErrors[`items.${index}.fixedAmount`] = msg.itemAmount;
    if (percent === null) fieldErrors[`items.${index}.percent`] = msg.itemPercent;

    if (name && kind && hours !== null && hourlyRate !== null && fixedAmount !== null && percent !== null && quantity !== null && unitCost !== null) {
      items.push({ name, kind, hours, hourlyRate, fixedAmount, percent, quantity, unitCost, unitLabel: asText(item.unitLabel).slice(0, 30) || null });
    }
  });

  const id = typeof raw.id === "string" && raw.id ? raw.id : undefined;

  if (Object.keys(fieldErrors).length > 0) {
    return { errors: { error: msg.fixFields, fieldErrors } };
  }

  return {
    data: {
      id,
      projectName,
      clientName,
      currency: currency as EstimateInput["currency"],
      revenue: pricingBasis === "per_unit" ? (unitCount as number) * (unitPrice as number) : (revenue as number),
      targetMargin: targetMargin as number,
      items,
      pricingBasis,
      unitCount,
      unitPrice,
      unitLabel,
    },
  };
}
