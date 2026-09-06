import type { CompanySizeBucket, CompanyStatus, RatingKey, TalentStatus } from "./types";

/** Built-in role list. Custom roles are free text on candidates and role profiles. */
export const TALENT_ROLES = [
  "Project Manager",
  "Delivery Manager",
  "Account Manager",
  "Sales / Business Development",
  "UI/UX Designer",
  "Web Designer",
  "Brand Designer",
  "Graphic Designer",
  "Webflow Developer",
  "Front-end Developer",
  "Full-stack Developer",
  "3D Designer",
  "Motion Designer",
  "Marketing Specialist",
  "PPC Specialist",
  "SEO Specialist",
  "Copywriter",
] as const;

export const TECHNOLOGIES = [
  "Webflow", "Figma", "GSAP", "React", "Next.js", "Three.js", "Blender", "Cinema 4D",
  "Adobe", "Meta Ads", "Google Ads", "WordPress", "Shopify", "HubSpot", "Framer",
] as const;

export const TALENT_STATUSES: readonly TalentStatus[] = [
  "discovered", "reviewed", "shortlisted", "contacted", "interview",
  "trial", "approved", "preferred", "rejected", "archived",
];

export const COMPANY_STATUSES: readonly CompanyStatus[] = [
  "discovered", "reviewed", "shortlisted", "contacted", "qualified", "rejected", "archived",
];

export const RATING_KEYS: readonly RatingKey[] = [
  "quality", "communication", "reliability", "speed", "technical", "creative",
];

export const SIZE_BUCKETS: readonly CompanySizeBucket[] = [
  "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+",
];

/** Buying-signal types. Free text is allowed, these are the known ones. */
export const SIGNAL_TYPES = [
  "recently_funded", "hiring_marketing", "hiring_designer", "hiring_developer",
  "launching_product", "new_market", "new_office", "rebrand", "new_management",
  "rapid_growth", "old_website", "poor_mobile", "weak_branding", "outdated_tech",
  "missing_conversion",
] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];

export const INDUSTRIES = [
  "SaaS", "E-commerce", "Hospitality", "Real Estate", "Fintech", "Healthcare",
  "Manufacturing", "Education", "Agency", "Consulting", "Retail", "Automotive", "Other",
] as const;

/** Scores at or above this are highlighted as "high match" / "high score". */
export const HIGH_TALENT_SCORE = 85;
export const HIGH_LEAD_SCORE = 80;

/** Records older than this are flagged as possibly stale. */
export const STALE_AFTER_DAYS = 30;

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

/** Connector retry policy: gentle by design. */
export const CONNECTOR_MAX_ATTEMPTS = 2;
export const CONNECTOR_RETRY_DELAY_MS = 500;
