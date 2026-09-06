export { CURRENCIES } from "@/config/currencies";

/**
 * Margin thresholds, default target margin and default currency are NOT
 * constants any more — they come from Business Settings
 * (`@/modules/settings/queries`). Role presets come from role costs there too.
 */

/** Fallback role names when no role costs are configured yet. */
export const FALLBACK_ROLE_PRESETS = [
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
