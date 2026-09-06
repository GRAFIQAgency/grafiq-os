import { CURRENCIES } from "@/config/currencies";
import { interpolate } from "@/lib/i18n/interpolate";

import { marginsAreOrdered, paymentTermsAddUp } from "./services";
import type { ActionResult, BusinessSettings, RoleCostInput } from "./types";

/** Translated messages (dict.settings.validation). Passed in to keep this file pure. */
export interface SettingsValidationMessages {
  fixFields: string;
  invalidPayload: string;
  companyName: string;
  maxLength: string;
  currency: string;
  vatRate: string;
  margin: string;
  marginOrder: string;
  paymentTermValue: string;
  paymentTermsSum: string;
  roleName: string;
  roleCost: string;
}

const MAX_NAME = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function isPercentBelow100(n: number | null): n is number {
  return n !== null && n >= 0 && n < 100;
}

type Outcome<T> = { data: T; errors?: undefined } | { data?: undefined; errors: ActionResult };

export function validateBusinessSettings(
  raw: unknown,
  msg: SettingsValidationMessages
): Outcome<BusinessSettings> {
  if (!isRecord(raw)) return { errors: { error: msg.invalidPayload } };
  const fieldErrors: Record<string, string> = {};

  const companyName = asText(raw.companyName);
  if (!companyName) fieldErrors.companyName = msg.companyName;
  else if (companyName.length > MAX_NAME) {
    fieldErrors.companyName = interpolate(msg.maxLength, { max: MAX_NAME });
  }

  const defaultCurrency = CURRENCIES.find((c) => c === raw.defaultCurrency);
  if (!defaultCurrency) fieldErrors.defaultCurrency = msg.currency;

  const vatRate = asNumber(raw.vatRate);
  if (vatRate === null || vatRate < 0 || vatRate > 100) fieldErrors.vatRate = msg.vatRate;

  const targetMargin = asNumber(raw.targetMargin);
  const warningMargin = asNumber(raw.warningMargin);
  const minimumMargin = asNumber(raw.minimumMargin);
  if (!isPercentBelow100(targetMargin)) fieldErrors.targetMargin = msg.margin;
  if (!isPercentBelow100(warningMargin)) fieldErrors.warningMargin = msg.margin;
  if (!isPercentBelow100(minimumMargin)) fieldErrors.minimumMargin = msg.margin;
  if (
    isPercentBelow100(targetMargin) &&
    isPercentBelow100(warningMargin) &&
    isPercentBelow100(minimumMargin) &&
    !marginsAreOrdered({ target: targetMargin, warning: warningMargin, minimum: minimumMargin })
  ) {
    fieldErrors.marginOrder = msg.marginOrder;
  }

  const rawTerms = Array.isArray(raw.paymentTerms) ? raw.paymentTerms : [];
  const paymentTerms: number[] = [];
  rawTerms.forEach((term, index) => {
    const n = asNumber(term);
    if (n === null || n < 0 || n > 100) fieldErrors[`paymentTerms.${index}`] = msg.paymentTermValue;
    else paymentTerms.push(n);
  });
  if (paymentTerms.length === rawTerms.length && !paymentTermsAddUp(paymentTerms)) {
    fieldErrors.paymentTerms = msg.paymentTermsSum;
  }

  if (Object.keys(fieldErrors).length > 0) return { errors: { error: msg.fixFields, fieldErrors } };

  return {
    data: {
      companyName,
      defaultCurrency: defaultCurrency as BusinessSettings["defaultCurrency"],
      vatRate: vatRate as number,
      targetMargin: targetMargin as number,
      warningMargin: warningMargin as number,
      minimumMargin: minimumMargin as number,
      paymentTerms,
    },
  };
}

export function validateRoleCost(raw: unknown, msg: SettingsValidationMessages): Outcome<RoleCostInput> {
  if (!isRecord(raw)) return { errors: { error: msg.invalidPayload } };
  const fieldErrors: Record<string, string> = {};

  const name = asText(raw.name);
  if (!name) fieldErrors.name = msg.roleName;
  else if (name.length > MAX_NAME) fieldErrors.name = interpolate(msg.maxLength, { max: MAX_NAME });

  const hourlyCost = asNumber(raw.hourlyCost);
  if (hourlyCost === null || hourlyCost < 0) fieldErrors.hourlyCost = msg.roleCost;

  const currency = CURRENCIES.find((c) => c === raw.currency);
  if (!currency) fieldErrors.currency = msg.currency;

  if (Object.keys(fieldErrors).length > 0) return { errors: { error: msg.fixFields, fieldErrors } };

  return {
    data: {
      id: typeof raw.id === "string" && raw.id ? raw.id : undefined,
      name,
      hourlyCost: hourlyCost as number,
      currency: currency as RoleCostInput["currency"],
      isActive: raw.isActive !== false,
    },
  };
}
