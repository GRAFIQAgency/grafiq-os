/**
 * Pure business-settings helpers. No React, no Supabase.
 * Other modules may import these freely (they are side-effect free).
 */
import { PERCENT_PRECISION } from "./constants";
import type { BusinessSettings, MarginThresholds } from "./types";

function roundPercent(value: number): number {
  const factor = 10 ** PERCENT_PRECISION;
  return Math.round(value * factor) / factor;
}

export function sumPaymentTerms(terms: readonly number[]): number {
  return roundPercent(terms.reduce((sum, t) => sum + t, 0));
}

/** True when the milestones add up to exactly 100 % (to 2 decimals). */
export function paymentTermsAddUp(terms: readonly number[]): boolean {
  return terms.length > 0 && sumPaymentTerms(terms) === 100;
}

/** Margins must satisfy minimum <= warning <= target. */
export function marginsAreOrdered(t: MarginThresholds): boolean {
  return t.minimum <= t.warning && t.warning <= t.target;
}

export function marginThresholds(settings: BusinessSettings): MarginThresholds {
  return {
    target: settings.targetMargin,
    warning: settings.warningMargin,
    minimum: settings.minimumMargin,
  };
}

/** Net → gross using the configured VAT rate (21 → ×1.21). */
export function applyVat(netAmount: number, vatRate: number): number {
  return netAmount * (1 + vatRate / 100);
}

/** Splits a net amount into milestone amounts according to payment terms. */
export function splitByPaymentTerms(amount: number, terms: readonly number[]): number[] {
  return terms.map((percent) => (amount * percent) / 100);
}
