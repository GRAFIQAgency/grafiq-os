import type {
  BusinessModel,
  CompanySizeBucket,
  CompanyStatus,
  CompanyType,
  CrmStatus,
  Currency,
  SearchRunStatus,
  SignalStrength,
  SourcingEntityType,
  TalentAvailability,
  TalentEmploymentType,
  TalentSeniority,
  TalentStatus,
} from "@/types/database";

export type EntityType = SourcingEntityType;
export type {
  BusinessModel,
  CompanySizeBucket,
  CompanyStatus,
  CompanyType,
  CrmStatus,
  SearchRunStatus,
  SignalStrength,
  TalentAvailability,
  TalentEmploymentType,
  TalentSeniority,
  TalentStatus,
};

export type RatingKey = "quality" | "communication" | "reliability" | "speed" | "technical" | "creative";
export type TalentRatings = Partial<Record<RatingKey, number>>;

/** Shared person entity (also used by Talent Bench later). */
export interface TalentCandidate {
  id: string;
  createdAt: string;
  updatedAt: string;
  fullName: string;
  headline: string | null;
  role: string | null;
  email: string | null;
  profileUrl: string | null;
  portfolioUrl: string | null;
  avatarUrl: string | null;
  country: string | null;
  city: string | null;
  remote: boolean | null;
  seniority: TalentSeniority | null;
  employmentType: TalentEmploymentType | null;
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  rateCurrency: Currency | null;
  availability: TalentAvailability | null;
  yearsExperience: number | null;
  agencyExperience: boolean | null;
  skills: string[];
  technologies: string[];
  languages: string[];
  summary: string | null;
  status: TalentStatus;
  inTalentBench: boolean;
  benchAddedAt: string | null;
  tags: string[];
  ratings: TalentRatings;
  aiScore: number | null;
  manualScore: number | null;
  firstDiscoveredAt: string;
  lastCheckedAt: string;
}

/** Shared company entity (also used by CRM later). */
export interface CompanyLead {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  domain: string | null;
  website: string | null;
  logoUrl: string | null;
  registrationId: string | null;
  industry: string | null;
  country: string | null;
  city: string | null;
  employeeCount: number | null;
  sizeBucket: CompanySizeBucket | null;
  revenue: number | null;
  revenueCurrency: Currency | null;
  foundedYear: number | null;
  description: string | null;
  technologies: string[];
  keywords: string[];
  businessModel: BusinessModel | null;
  companyType: CompanyType | null;
  language: string | null;
  status: CompanyStatus;
  crmStatus: CrmStatus | null;
  crmAddedAt: string | null;
  tags: string[];
  leadScore: number | null;
  manualScore: number | null;
  firstDiscoveredAt: string;
  lastCheckedAt: string;
}

export interface CompanySignal {
  id: string;
  companyId: string;
  type: string;
  strength: SignalStrength;
  confidence: number;
  detectedAt: string;
  sourceId: string | null;
  description: string | null;
}

export interface CompanyContact {
  id: string;
  companyId: string;
  name: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  profileUrl: string | null;
  sourceId: string | null;
}

export interface RoleProfile {
  id: string;
  name: string;
  role: string;
  description: string | null;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  minYearsExperience: number | null;
  preferredCountries: string[];
  maxHourlyRate: number | null;
  rateCurrency: Currency | null;
  agencyExperiencePreferred: boolean;
  communicationExpectations: string | null;
  portfolioRequired: boolean;
  isActive: boolean;
}

export interface ScoreFactor {
  factor: string;
  weight: number;
  score: number;
  note?: string;
}

export interface AiEvaluation {
  id: string;
  createdAt: string;
  entityType: EntityType;
  entityId: string;
  roleProfileId: string | null;
  provider: string;
  model: string | null;
  score: number;
  strengths: string[];
  weaknesses: string[];
  missingInfo: string[];
  risks: string[];
  reasoning: string | null;
  factors: ScoreFactor[];
}

export interface InternalNote {
  id: string;
  createdAt: string;
  authorName: string | null;
  body: string;
}

export interface ActivityEntry {
  id: string;
  createdAt: string;
  action: string;
  actorName: string | null;
  details: Record<string, unknown>;
}

export interface SourceRecordSummary {
  id: string;
  sourceId: string;
  sourceEntityId: string;
  sourceUrl: string | null;
  retrievedAt: string;
  payload: Record<string, unknown>;
}

export interface SearchRunError {
  sourceId: string;
  message: string;
  retries: number;
}

export interface SearchRun {
  id: string;
  createdAt: string;
  searchId: string | null;
  entityType: EntityType;
  status: SearchRunStatus;
  startedAt: string | null;
  finishedAt: string | null;
  sourcesTotal: number;
  sourcesCompleted: number;
  resultsTotal: number;
  resultsNew: number;
  resultsDuplicates: number;
  errors: SearchRunError[];
}

export interface SavedSearch {
  id: string;
  createdAt: string;
  entityType: EntityType;
  name: string;
  filters: TalentFilters | CompanyFilters;
  lastRunAt: string | null;
}

/** Connector metadata merged with its persisted state. */
export interface SourceState {
  id: string;
  name: string;
  type: string;
  supportedEntityTypes: EntityType[];
  rateLimit: { requestsPerMinute: number } | null;
  enabled: boolean;
  lastRunAt: string | null;
  lastError: string | null;
  recordsCollected: number;
}

// ---------------------------------------------------------------------------
// Filters (URL-serialisable; parsed by services/filters.ts)
// ---------------------------------------------------------------------------

export interface TalentFilters {
  q?: string;
  role?: string;
  skills?: string[];
  technologies?: string[];
  country?: string;
  city?: string;
  remote?: boolean;
  seniority?: TalentSeniority;
  employmentType?: TalentEmploymentType;
  rateMin?: number;
  rateMax?: number;
  availability?: TalentAvailability;
  languages?: string[];
  minYears?: number;
  hasPortfolio?: boolean;
  agencyExperience?: boolean;
  status?: TalentStatus;
  minScore?: number;
  tags?: string[];
  inBench?: boolean;
}

export interface CompanyFilters {
  q?: string;
  country?: string;
  city?: string;
  industry?: string;
  sizeBucket?: CompanySizeBucket;
  employeesMin?: number;
  employeesMax?: number;
  technologies?: string[];
  keywords?: string[];
  foundedAfter?: number;
  foundedBefore?: number;
  businessModel?: BusinessModel;
  companyType?: CompanyType;
  language?: string;
  signals?: string[];
  status?: CompanyStatus;
  minScore?: number;
  tags?: string[];
  inCrm?: boolean;
}

export type SortOrder = "newest" | "score";

export interface ListParams {
  page: number;
  pageSize: number;
  sort: SortOrder;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ActionResult {
  error?: string;
}

export interface SearchRunResult extends ActionResult {
  run?: SearchRun;
}
