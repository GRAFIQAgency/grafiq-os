import type {
  ActivityLogRow,
  AiEvaluationRow,
  CompanyContactRow,
  CompanyLeadRow,
  CompanySignalRow,
  InternalNoteRow,
  SourcingSearchRow,
  SourcingSearchRunRow,
  SourcingSourceRecordRow,
  TalentCandidateRow,
  TalentRoleProfileRow,
} from "@/types/database";

import type {
  ActivityEntry,
  AiEvaluation,
  CompanyContact,
  CompanyLead,
  CompanySignal,
  InternalNote,
  RoleProfile,
  SavedSearch,
  SearchRun,
  SourceRecordSummary,
  TalentCandidate,
  TalentRatings,
} from "../types";

const num = (v: number | string | null) => (v == null ? null : Number(v));

export function rowToTalent(r: TalentCandidateRow): TalentCandidate {
  return {
    id: r.id, createdAt: r.created_at, updatedAt: r.updated_at, fullName: r.full_name, headline: r.headline,
    role: r.role, email: r.email, profileUrl: r.profile_url, portfolioUrl: r.portfolio_url, avatarUrl: r.avatar_url,
    country: r.country, city: r.city, remote: r.remote, seniority: r.seniority, employmentType: r.employment_type,
    hourlyRateMin: num(r.hourly_rate_min), hourlyRateMax: num(r.hourly_rate_max), rateCurrency: r.rate_currency,
    availability: r.availability, yearsExperience: num(r.years_experience), agencyExperience: r.agency_experience,
    skills: r.skills ?? [], technologies: r.technologies ?? [], languages: r.languages ?? [], summary: r.summary,
    status: r.status, inTalentBench: r.in_talent_bench, benchAddedAt: r.bench_added_at, tags: r.tags ?? [],
    ratings: (r.ratings ?? {}) as TalentRatings, aiScore: r.ai_score, manualScore: r.manual_score,
    firstDiscoveredAt: r.first_discovered_at, lastCheckedAt: r.last_checked_at,
  };
}

export function rowToCompany(r: CompanyLeadRow): CompanyLead {
  return {
    id: r.id, createdAt: r.created_at, updatedAt: r.updated_at, name: r.name, domain: r.domain, website: r.website,
    logoUrl: r.logo_url, registrationId: r.registration_id, industry: r.industry, country: r.country, city: r.city,
    employeeCount: r.employee_count, sizeBucket: r.size_bucket, revenue: num(r.revenue), revenueCurrency: r.revenue_currency,
    foundedYear: r.founded_year, description: r.description, technologies: r.technologies ?? [], keywords: r.keywords ?? [],
    businessModel: r.business_model, companyType: r.company_type, language: r.language, status: r.status,
    crmStatus: r.crm_status, crmAddedAt: r.crm_added_at, tags: r.tags ?? [], leadScore: r.lead_score,
    manualScore: r.manual_score, firstDiscoveredAt: r.first_discovered_at, lastCheckedAt: r.last_checked_at,
  };
}

export function rowToSignal(r: CompanySignalRow): CompanySignal {
  return {
    id: r.id, companyId: r.company_id, type: r.type, strength: r.strength, confidence: Number(r.confidence),
    detectedAt: r.detected_at, sourceId: r.source_id, description: r.description,
  };
}

export function rowToContact(r: CompanyContactRow): CompanyContact {
  return {
    id: r.id, companyId: r.company_id, name: r.name, jobTitle: r.job_title, email: r.email, phone: r.phone,
    profileUrl: r.profile_url, sourceId: r.source_id,
  };
}

export function rowToRoleProfile(r: TalentRoleProfileRow): RoleProfile {
  return {
    id: r.id, name: r.name, role: r.role, description: r.description, requiredSkills: r.required_skills ?? [],
    niceToHaveSkills: r.nice_to_have_skills ?? [], minYearsExperience: num(r.min_years_experience),
    preferredCountries: r.preferred_countries ?? [], maxHourlyRate: num(r.max_hourly_rate), rateCurrency: r.rate_currency,
    agencyExperiencePreferred: r.agency_experience_preferred, communicationExpectations: r.communication_expectations,
    portfolioRequired: r.portfolio_required, isActive: r.is_active,
  };
}

export function rowToEvaluation(r: AiEvaluationRow): AiEvaluation {
  return {
    id: r.id, createdAt: r.created_at, entityType: r.entity_type, entityId: r.entity_id, roleProfileId: r.role_profile_id,
    provider: r.provider, model: r.model, score: r.score, strengths: r.strengths ?? [], weaknesses: r.weaknesses ?? [],
    missingInfo: r.missing_info ?? [], risks: r.risks ?? [], reasoning: r.reasoning, factors: r.factors ?? [],
  };
}

export function rowToNote(r: InternalNoteRow): InternalNote {
  return { id: r.id, createdAt: r.created_at, authorName: r.author_name, body: r.body };
}

export function rowToActivity(r: ActivityLogRow): ActivityEntry {
  return { id: r.id, createdAt: r.created_at, action: r.action, actorName: r.actor_name, details: r.details ?? {} };
}

export function rowToSourceRecord(r: SourcingSourceRecordRow): SourceRecordSummary {
  return {
    id: r.id, sourceId: r.source_id, sourceEntityId: r.source_entity_id, sourceUrl: r.source_url,
    retrievedAt: r.retrieved_at, payload: r.payload ?? {},
  };
}

export function rowToRun(r: SourcingSearchRunRow): SearchRun {
  return {
    id: r.id, createdAt: r.created_at, searchId: r.search_id, entityType: r.entity_type, status: r.status,
    startedAt: r.started_at, finishedAt: r.finished_at, sourcesTotal: r.sources_total, sourcesCompleted: r.sources_completed,
    resultsTotal: r.results_total, resultsNew: r.results_new, resultsDuplicates: r.results_duplicates, errors: r.errors ?? [],
  };
}

export function rowToSavedSearch(r: SourcingSearchRow): SavedSearch {
  return {
    id: r.id, createdAt: r.created_at, entityType: r.entity_type, name: r.name,
    filters: (r.filters ?? {}) as SavedSearch["filters"], lastRunAt: r.last_run_at,
  };
}
