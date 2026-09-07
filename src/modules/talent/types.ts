import type { BenchStatus, Currency, EngagementType, TalentAvailability, TalentSeniority } from "@/types/database";
import type { TalentCandidate, TalentRatings } from "@/modules/sourcing/types";

export type { BenchStatus, EngagementType };

/** Operational fields stored 1:1 with the shared person record. */
export interface BenchDetails {
  talentCandidateId: string;
  benchStatus: BenchStatus;
  engagementType: EngagementType | null;
  hourlyCost: number | null;
  costCurrency: Currency | null;
  dayRate: number | null;
  minimumEngagement: string | null;
  commercialNotes: string | null;
  availableFrom: string | null;
  maxMonthlyHours: number | null;
  preferredMonthlyHours: number | null;
  updatedAt: string | null;
}

/**
 * A bench member = the shared person (from Sourcing) + bench details + derived
 * operational values (cost with fallbacks, engagement type, preferred flag).
 */
export interface TalentPerson {
  candidate: TalentCandidate;
  details: BenchDetails;
  /** Person-specific hourly cost when set, else the rate known from sourcing. */
  hourlyCost: number | null;
  costCurrency: Currency | null;
  /** True when the cost comes from bench details (not from a sourcing rate). */
  costIsPersonSpecific: boolean;
  engagementType: EngagementType | null;
  preferred: boolean;
  ratings: TalentRatings;
}

export interface TalentFilters {
  q?: string;
  role?: string;
  skills?: string[];
  seniority?: TalentSeniority;
  country?: string;
  availability?: TalentAvailability;
  engagementType?: EngagementType;
  preferredOnly?: boolean;
  status?: BenchStatus;
  rateMin?: number;
  rateMax?: number;
}

export type TalentSort = "quality" | "reliability" | "cost" | "availability" | "name" | "recent";

export interface BenchDetailsInput {
  benchStatus: BenchStatus;
  availability: TalentAvailability | null;
  availableFrom: string | null;
  maxMonthlyHours: number | null;
  preferredMonthlyHours: number | null;
  engagementType: EngagementType | null;
  hourlyCost: number | null;
  costCurrency: Currency | null;
  dayRate: number | null;
  minimumEngagement: string | null;
  commercialNotes: string | null;
}

/** Settings → People rates row (role + own hourly cost). */
export interface PersonRateInput {
  fullName?: string;
  role: string | null;
  hourlyCost: number | null;
  costCurrency: Currency | null;
}

/** Compact shape for future Projects / Capacity / Pricing modules. */
export interface TalentCapacityRecord {
  id: string;
  fullName: string;
  role: string | null;
  skills: string[];
  seniority: TalentSeniority | null;
  hourlyCost: number | null;
  costCurrency: Currency | null;
  costIsPersonSpecific: boolean;
  availability: TalentAvailability | null;
  availableFrom: string | null;
  maxMonthlyHours: number | null;
  preferredMonthlyHours: number | null;
  benchStatus: BenchStatus;
  engagementType: EngagementType | null;
}

export interface ActionResult {
  error?: string;
  fieldErrors?: Record<string, string>;
}
