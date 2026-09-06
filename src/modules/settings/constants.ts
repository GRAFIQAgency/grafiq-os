import type { BusinessSettings } from "./types";

/**
 * Used until the `business_settings` row exists (e.g. before the migration
 * has been applied). Mirrors the column defaults in 0003_business_settings.sql.
 */
export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  companyName: "GRAFIQ",
  defaultCurrency: "CZK",
  vatRate: 21,
  targetMargin: 60,
  warningMargin: 50,
  minimumMargin: 40,
  paymentTerms: [50, 30, 20],
};

/** Payment-term percentages are compared with this tolerance (2 decimals). */
export const PERCENT_PRECISION = 2;
