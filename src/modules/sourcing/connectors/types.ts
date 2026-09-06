import type { Currency } from "@/types/database";

import type {
  BusinessModel,
  CompanyFilters,
  CompanyType,
  EntityType,
  SignalStrength,
  TalentAvailability,
  TalentEmploymentType,
  TalentFilters,
  TalentSeniority,
} from "../types";

/**
 * Source connector contract. Every external source is one connector that can
 * be enabled/disabled independently. Connectors must only use permitted
 * access (official/public APIs, feeds, CSV, manual import) — never bypass
 * logins, CAPTCHAs, rate limits or robots restrictions.
 */

export type ConnectorType = "mock" | "api" | "feed" | "public_web" | "csv" | "manual";

/** Connector-normalised talent record (already mapped from the source's own shape). */
export interface NormalizedTalent {
  sourceEntityId: string;
  sourceUrl?: string;
  fullName: string;
  headline?: string;
  role?: string;
  email?: string;
  profileUrl?: string;
  portfolioUrl?: string;
  avatarUrl?: string;
  country?: string;
  city?: string;
  remote?: boolean;
  seniority?: TalentSeniority;
  employmentType?: TalentEmploymentType;
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  rateCurrency?: Currency;
  availability?: TalentAvailability;
  yearsExperience?: number;
  agencyExperience?: boolean;
  skills?: string[];
  technologies?: string[];
  languages?: string[];
  summary?: string;
}

export interface NormalizedSignal {
  type: string;
  strength: SignalStrength;
  confidence: number;
  description?: string;
  detectedAt?: string;
}

export interface NormalizedContact {
  name: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  profileUrl?: string;
}

export interface NormalizedCompany {
  sourceEntityId: string;
  sourceUrl?: string;
  name: string;
  website?: string;
  logoUrl?: string;
  registrationId?: string;
  industry?: string;
  country?: string;
  city?: string;
  employeeCount?: number;
  revenue?: number;
  revenueCurrency?: Currency;
  foundedYear?: number;
  description?: string;
  technologies?: string[];
  keywords?: string[];
  businessModel?: BusinessModel;
  companyType?: CompanyType;
  language?: string;
  signals?: NormalizedSignal[];
  contacts?: NormalizedContact[];
}

export interface ConnectorSearchRequest {
  entityType: EntityType;
  filters: TalentFilters | CompanyFilters;
  /** Upper bound the engine asks for; connectors may return fewer. */
  limit: number;
}

export interface ConnectorSearchResponse {
  talent: NormalizedTalent[];
  companies: NormalizedCompany[];
}

export interface ConnectorTestResult {
  ok: boolean;
  message?: string;
}

export interface SourceConnector {
  id: string;
  name: string;
  type: ConnectorType;
  supportedEntityTypes: EntityType[];
  /** Advisory limit the engine respects between calls. */
  rateLimit?: { requestsPerMinute: number };
  /** Discover records matching filters. Must throw on failure (engine handles retries). */
  search(request: ConnectorSearchRequest): Promise<ConnectorSearchResponse>;
  /** Optional: refresh one record by its source entity id. */
  fetchDetails?(entityType: EntityType, sourceEntityId: string): Promise<NormalizedTalent | NormalizedCompany | null>;
  testConnection(): Promise<ConnectorTestResult>;
}

export function emptyResponse(): ConnectorSearchResponse {
  return { talent: [], companies: [] };
}
