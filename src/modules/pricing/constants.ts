import type { PricingCurrency } from "@/types/database";

/**
 * Project health thresholds, in gross-margin percent.
 * healthy: margin >= HEALTHY_MIN
 * warning: WARNING_MIN <= margin < HEALTHY_MIN
 * bad:     margin < WARNING_MIN
 */
export const HEALTH_THRESHOLDS = {
  HEALTHY_MIN: 60,
  WARNING_MIN: 50,
} as const;

/** Default target gross margin (percent) for a new estimate. */
export const DEFAULT_TARGET_MARGIN = 60;

export const CURRENCIES: readonly PricingCurrency[] = ["CZK", "EUR", "USD"];
export const DEFAULT_CURRENCY: PricingCurrency = "CZK";

/** Suggested role names offered when adding a cost line. */
export const COST_ROLE_PRESETS = [
  "Designer",
  "Developer",
  "Project Manager",
  "Sales commission",
  "3D Designer",
  "Copywriter",
  "Other",
] as const;

/** How many saved estimates the "Recent Estimates" list shows. */
export const RECENT_ESTIMATES_LIMIT = 10;
