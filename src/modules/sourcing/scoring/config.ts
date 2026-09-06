/**
 * Lead-score factor weights (sum to 1). Adjust here; a settings UI can come later.
 */
export const LEAD_SCORE_WEIGHTS = {
  companyFit: 0.2,
  companySize: 0.15,
  industryRelevance: 0.15,
  buyingSignals: 0.25,
  websiteOpportunity: 0.1,
  growth: 0.05,
  location: 0.05,
  budgetPotential: 0.05,
} as const;

/** Industries GRAFIQ sells into most easily. */
export const TARGET_INDUSTRIES = ["saas", "e-commerce", "hospitality", "real estate", "fintech", "healthcare", "education"];
/** Countries close to home. */
export const HOME_COUNTRIES = ["czech republic", "slovakia"];
export const NEAR_COUNTRIES = ["germany", "austria", "poland", "netherlands"];

/** Talent-score weights. */
export const TALENT_SCORE_WEIGHTS = {
  requiredSkills: 0.4,
  niceToHave: 0.1,
  experience: 0.15,
  rate: 0.1,
  location: 0.05,
  agency: 0.1,
  portfolio: 0.1,
} as const;
