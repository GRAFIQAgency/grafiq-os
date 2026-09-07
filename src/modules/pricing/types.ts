import type {
  PricingCostItemKind,
  PricingCostItemRow,
  PricingCurrency,
  PricingEstimateRow,
  PricingModel,
} from "@/types/database";

export type Currency = PricingCurrency;
export type CostItemKind = PricingCostItemKind;

/** A cost line with parsed numbers — what calculations and actions consume. */
export interface CostItemInput {
  name: string;
  kind: CostItemKind;
  hours: number;
  hourlyRate: number;
  fixedAmount: number;
  /** Share of the client price in percent (kind = percent). */
  percent: number;
}

/** A complete estimate with parsed numbers. `id` is set when editing a saved one. */
export interface EstimateInput {
  id?: string;
  projectName: string;
  clientName: string;
  currency: Currency;
  /** Client price excluding VAT. */
  revenue: number;
  /** Target gross margin in percent (0–99.99). */
  targetMargin: number;
  items: CostItemInput[];
}

export type HealthStatus = "healthy" | "warning" | "bad";

export interface PricingSummary {
  revenue: number;
  directCosts: number;
  grossProfit: number;
  /** Percent. `null` when revenue is zero (margin is undefined). */
  grossMargin: number | null;
  targetMargin: number;
  /** `null` when target margin is >= 100 % (no finite price satisfies it). */
  recommendedPrice: number | null;
  health: HealthStatus;
  /** True when the margin is below the configured minimum (founder approval). */
  requiresApproval: boolean;
}

/** Saved estimate with its cost items, as returned by queries. */
export interface EstimateWithItems extends PricingEstimateRow {
  pricing_cost_items: PricingCostItemRow[];
}

/** Row for the "Recent Estimates" list. */
export interface EstimateListItem {
  id: string;
  projectName: string;
  clientName: string | null;
  currency: Currency;
  revenue: number;
  grossMargin: number | null;
  health: HealthStatus;
  createdAt: string;
}

/** Defaults and presets a new estimate starts from (Business Settings + Talent Bench). */
export interface PricingDefaults {
  currency: Currency;
  targetMargin: number;
  /** Active roles with their default hourly cost, used as cost-line presets. */
  rolePresets: RolePreset[];
  /** Active Talent Bench people with their own rate (or none), used as cost-line presets. */
  peoplePresets: PersonPreset[];
}

export interface PersonPreset {
  id: string;
  name: string;
  role: string | null;
  /** How the person is usually paid (Settings → People rates). */
  pricingModel: PricingModel;
  hourlyCost: number | null;
  fixedPrice: number | null;
  marginPercent: number | null;
  currency: Currency | null;
}

export interface RolePreset {
  name: string;
  hourlyCost: number;
  currency: Currency;
}

export interface SaveEstimateResult {
  id?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}
