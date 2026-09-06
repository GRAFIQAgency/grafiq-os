/**
 * Hand-written database types for the current (small) schema.
 *
 * When the schema grows, replace this file with generated types:
 *   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
 * and update the Supabase client factories to use `Database`.
 */

export type UserRole = "admin" | "member";

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// --- Pricing module (supabase/migrations/0002_pricing.sql) ---

export type PricingCurrency = "CZK" | "EUR" | "USD";
export type PricingCostItemKind = "hourly" | "fixed";

export interface PricingEstimateRow {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  project_name: string;
  client_name: string | null;
  currency: PricingCurrency;
  /** Client price excluding VAT. Postgres numeric → arrives as number via PostgREST. */
  revenue: number;
  /** Target gross margin in percent (0–99.99). */
  target_margin: number;
}

export interface PricingCostItemRow {
  id: string;
  estimate_id: string;
  created_at: string;
  name: string;
  kind: PricingCostItemKind;
  hours: number;
  hourly_rate: number;
  fixed_amount: number;
  position: number;
}
