import type { Currency } from "@/types/database";

/** Company-wide business defaults (percentages are 0–100, e.g. 60 = 60 %). */
export interface BusinessSettings {
  companyName: string;
  defaultCurrency: Currency;
  vatRate: number;
  targetMargin: number;
  warningMargin: number;
  /** Below this margin a deal needs founder approval. */
  minimumMargin: number;
  /** Payment milestones as percentages that add up to 100, e.g. [50, 30, 20]. */
  paymentTerms: number[];
}

export interface MarginThresholds {
  target: number;
  warning: number;
  minimum: number;
}

export interface RoleCost {
  id: string;
  name: string;
  hourlyCost: number;
  currency: Currency;
  isActive: boolean;
  position: number;
}

export interface RoleCostInput {
  id?: string;
  name: string;
  hourlyCost: number;
  currency: Currency;
  isActive: boolean;
}

export interface ActionResult {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface SaveRoleCostResult extends ActionResult {
  id?: string;
}
