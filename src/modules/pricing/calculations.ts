/**
 * Pure pricing maths. No React, no Supabase — keep it that way so it stays
 * trivially unit-testable (see calculations.test.ts).
 *
 * All margins are in percent (60 means 60 %). Health thresholds come from
 * Business Settings (Settings → Business → Project economics).
 *
 * Cost lines come in three kinds:
 *   hourly  = hours × hourly rate
 *   fixed   = flat amount per project
 *   percent = share of the client price (sales commission, PM fee)
 */
import type { MarginThresholds } from "@/modules/settings/types";

import type { CostItemInput, EstimateInput, HealthStatus, PricingSummary } from "./types";

/** Cost of one line. Percent lines depend on the client price (`revenue`). */
export function costItemTotal(item: CostItemInput, revenue = 0): number {
  switch (item.kind) {
    case "fixed":
      return item.fixedAmount;
    case "percent":
      return (revenue * item.percent) / 100;
    default:
      return item.hours * item.hourlyRate;
  }
}

export function totalDirectCosts(items: readonly CostItemInput[], revenue = 0): number {
  return items.reduce((sum, item) => sum + costItemTotal(item, revenue), 0);
}

/** Direct costs that do not scale with the price (hourly + fixed lines). */
export function fixedDirectCosts(items: readonly CostItemInput[]): number {
  return items.filter((i) => i.kind !== "percent").reduce((sum, item) => sum + costItemTotal(item), 0);
}

/** Sum of the percent lines, in percent of the client price. */
export function percentShare(items: readonly CostItemInput[]): number {
  return items.filter((i) => i.kind === "percent").reduce((sum, item) => sum + item.percent, 0);
}

export function grossProfit(revenue: number, directCosts: number): number {
  return revenue - directCosts;
}

/** Gross margin in percent, or `null` when revenue is zero (undefined ratio). */
export function grossMargin(revenue: number, directCosts: number): number | null {
  if (revenue <= 0) return null;
  return (grossProfit(revenue, directCosts) / revenue) * 100;
}

/**
 * Minimum selling price that reaches the target margin. Percent-of-price
 * costs scale with the price, so they move into the divisor:
 *   price × (1 − target/100) = fixedCosts + price × share/100
 *   price = fixedCosts / (1 − target/100 − share/100)
 * Returns `null` when target margin + percent share is 100 % or more
 * (no finite price satisfies it).
 */
export function recommendedSellingPrice(fixedCosts: number, targetMargin: number, share = 0): number | null {
  const divisor = 1 - targetMargin / 100 - share / 100;
  if (divisor <= 0) return null;
  return fixedCosts / divisor;
}

/**
 * healthy: margin >= target
 * warning: warning <= margin < target
 * bad:     margin < warning (or margin undefined)
 */
export function healthStatus(margin: number | null, thresholds: MarginThresholds): HealthStatus {
  if (margin === null) return "bad";
  if (margin >= thresholds.target) return "healthy";
  if (margin >= thresholds.warning) return "warning";
  return "bad";
}

/** Below the minimum margin a deal needs founder approval. */
export function requiresFounderApproval(margin: number | null, thresholds: MarginThresholds): boolean {
  return margin !== null && margin < thresholds.minimum;
}

export function summarizeEstimate(estimate: EstimateInput, thresholds: MarginThresholds): PricingSummary {
  const directCosts = totalDirectCosts(estimate.items, estimate.revenue);
  const margin = grossMargin(estimate.revenue, directCosts);

  return {
    revenue: estimate.revenue,
    directCosts,
    grossProfit: grossProfit(estimate.revenue, directCosts),
    grossMargin: margin,
    targetMargin: estimate.targetMargin,
    recommendedPrice: recommendedSellingPrice(fixedDirectCosts(estimate.items), estimate.targetMargin, percentShare(estimate.items)),
    health: healthStatus(margin, thresholds),
    requiresApproval: requiresFounderApproval(margin, thresholds),
  };
}
