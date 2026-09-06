/**
 * Pure pricing maths. No React, no Supabase — keep it that way so it stays
 * trivially unit-testable (see calculations.test.ts).
 *
 * All margins are in percent (60 means 60 %).
 */
import { HEALTH_THRESHOLDS } from "./constants";
import type { CostItemInput, EstimateInput, HealthStatus, PricingSummary } from "./types";

export function costItemTotal(item: CostItemInput): number {
  return item.kind === "fixed" ? item.fixedAmount : item.hours * item.hourlyRate;
}

export function totalDirectCosts(items: readonly CostItemInput[]): number {
  return items.reduce((sum, item) => sum + costItemTotal(item), 0);
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
 * Minimum selling price that reaches the target margin:
 *   price = directCosts / (1 - targetMargin/100)
 * Returns `null` when the target margin is 100 % or more.
 */
export function recommendedSellingPrice(directCosts: number, targetMargin: number): number | null {
  if (targetMargin >= 100) return null;
  const divisor = 1 - targetMargin / 100;
  return directCosts / divisor;
}

export function healthStatus(margin: number | null): HealthStatus {
  if (margin === null) return "bad";
  if (margin >= HEALTH_THRESHOLDS.HEALTHY_MIN) return "healthy";
  if (margin >= HEALTH_THRESHOLDS.WARNING_MIN) return "warning";
  return "bad";
}

export function summarizeEstimate(estimate: EstimateInput): PricingSummary {
  const directCosts = totalDirectCosts(estimate.items);
  const margin = grossMargin(estimate.revenue, directCosts);

  return {
    revenue: estimate.revenue,
    directCosts,
    grossProfit: grossProfit(estimate.revenue, directCosts),
    grossMargin: margin,
    targetMargin: estimate.targetMargin,
    recommendedPrice: recommendedSellingPrice(directCosts, estimate.targetMargin),
    health: healthStatus(margin),
  };
}
