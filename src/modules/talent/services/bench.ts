/**
 * Pure Talent Bench rules. No React, no Supabase — unit-tested.
 */
import type { TalentCandidate } from "@/modules/sourcing/types";
import type { EngagementType, TalentBenchDetailsRow, TalentEmploymentType } from "@/types/database";

import { STAFFABLE_STATUSES } from "../constants";
import type { BenchDetails, TalentCapacityRecord, TalentFilters, TalentPerson, TalentSort } from "../types";

/** Defaults used when a bench member has no details row yet (created lazily on first edit). */
export function defaultDetails(candidateId: string): BenchDetails {
  return {
    talentCandidateId: candidateId, benchStatus: "active", engagementType: null, hourlyCost: null, costCurrency: null,
    dayRate: null, minimumEngagement: null, commercialNotes: null, availableFrom: null, maxMonthlyHours: null,
    preferredMonthlyHours: null, pricingModel: "hourly", fixedPrice: null, marginPercent: null, unitPrice: null, unitLabel: null, updatedAt: null,
  };
}

export function rowToDetails(r: TalentBenchDetailsRow): BenchDetails {
  return {
    talentCandidateId: r.talent_candidate_id, benchStatus: r.bench_status, engagementType: r.engagement_type,
    hourlyCost: r.hourly_cost == null ? null : Number(r.hourly_cost), costCurrency: r.cost_currency,
    dayRate: r.day_rate == null ? null : Number(r.day_rate), minimumEngagement: r.minimum_engagement,
    commercialNotes: r.commercial_notes, availableFrom: r.available_from, maxMonthlyHours: r.max_monthly_hours,
    preferredMonthlyHours: r.preferred_monthly_hours, pricingModel: r.pricing_model ?? "hourly",
    fixedPrice: r.fixed_price == null ? null : Number(r.fixed_price), marginPercent: r.margin_percent == null ? null : Number(r.margin_percent),
    unitPrice: r.unit_price == null ? null : Number(r.unit_price), unitLabel: r.unit_label ?? null,
    updatedAt: r.updated_at,
  };
}

const EMPLOYMENT_TO_ENGAGEMENT: Record<TalentEmploymentType, EngagementType> = {
  freelancer: "freelancer", contractor: "contractor", employee: "employee",
};

/**
 * Joins the shared person with its bench details. Details belonging to a
 * different person are ignored (defensive: never mix operational data across records).
 */
export function toTalentPerson(candidate: TalentCandidate, details: BenchDetails | null): TalentPerson {
  const d = details && details.talentCandidateId === candidate.id ? details : defaultDetails(candidate.id);
  const personSpecific = d.hourlyCost != null;
  return {
    candidate,
    details: d,
    hourlyCost: personSpecific ? d.hourlyCost : candidate.hourlyRateMin ?? candidate.hourlyRateMax ?? null,
    costCurrency: personSpecific ? d.costCurrency ?? candidate.rateCurrency : candidate.rateCurrency,
    costIsPersonSpecific: personSpecific,
    engagementType: d.engagementType ?? (candidate.employmentType ? EMPLOYMENT_TO_ENGAGEMENT[candidate.employmentType] : null),
    preferred: d.benchStatus === "preferred",
    ratings: candidate.ratings,
  };
}

/** Can this person be staffed right now (status, availability and start date)? */
export function isAvailableForWork(person: TalentPerson, today = new Date()): boolean {
  if (!person.candidate.inTalentBench) return false;
  if (!STAFFABLE_STATUSES.includes(person.details.benchStatus)) return false;
  if (person.candidate.availability === "unavailable") return false;
  if (person.details.availableFrom && new Date(person.details.availableFrom) > today) return false;
  return true;
}

/** Archive keeps the person, their sourcing history and their bench details; it only flips lifecycle fields. */
export function archiveTransition(): { candidate: { in_talent_bench: false }; details: { bench_status: "archived" } } {
  return { candidate: { in_talent_bench: false }, details: { bench_status: "archived" } };
}

export function restoreTransition(): { candidate: { in_talent_bench: true }; details: { bench_status: "active" } } {
  return { candidate: { in_talent_bench: true }, details: { bench_status: "active" } };
}

const lc = (s: string | null | undefined) => (s ?? "").toLowerCase();

/** In-memory filters (the list is small; the DB pre-filters bench membership and status). */
export function matchesFilters(person: TalentPerson, f: TalentFilters): boolean {
  const c = person.candidate;
  if (f.q) {
    const hay = [c.fullName, c.headline, c.role, c.city, c.country, ...c.skills, ...c.technologies, ...c.tags].map(lc).join(" ");
    if (!f.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  if (f.role && !lc(c.role).includes(f.role.toLowerCase())) return false;
  if (f.skills?.length) {
    const pool = [...c.skills, ...c.technologies].map(lc);
    if (!f.skills.every((s) => pool.some((p) => p.includes(s.toLowerCase())))) return false;
  }
  if (f.seniority && c.seniority !== f.seniority) return false;
  if (f.country && lc(c.country) !== f.country.toLowerCase()) return false;
  if (f.availability && c.availability !== f.availability) return false;
  if (f.engagementType && person.engagementType !== f.engagementType) return false;
  if (f.preferredOnly && !person.preferred) return false;
  if (f.status && person.details.benchStatus !== f.status) return false;
  if (f.rateMin !== undefined && (person.hourlyCost ?? -Infinity) < f.rateMin) return false;
  if (f.rateMax !== undefined && (person.hourlyCost ?? Infinity) > f.rateMax) return false;
  return true;
}

const AVAILABILITY_ORDER = { available: 0, limited: 1, unknown: 2, unavailable: 3 } as const;

export function sortPeople(people: TalentPerson[], sort: TalentSort): TalentPerson[] {
  const byRating = (key: "quality" | "reliability") => (a: TalentPerson, b: TalentPerson) =>
    (b.ratings[key] ?? -1) - (a.ratings[key] ?? -1) || a.candidate.fullName.localeCompare(b.candidate.fullName);
  const sorters: Record<TalentSort, (a: TalentPerson, b: TalentPerson) => number> = {
    quality: byRating("quality"),
    reliability: byRating("reliability"),
    cost: (a, b) => (a.hourlyCost ?? Infinity) - (b.hourlyCost ?? Infinity),
    availability: (a, b) =>
      AVAILABILITY_ORDER[a.candidate.availability ?? "unknown"] - AVAILABILITY_ORDER[b.candidate.availability ?? "unknown"] ||
      (a.details.availableFrom ?? "").localeCompare(b.details.availableFrom ?? ""),
    name: (a, b) => a.candidate.fullName.localeCompare(b.candidate.fullName),
    recent: (a, b) => (b.candidate.benchAddedAt ?? "").localeCompare(a.candidate.benchAddedAt ?? ""),
  };
  return [...people].sort(sorters[sort]);
}

/** Shape future modules consume (Projects, Capacity, Pricing fallbacks). */
export function toCapacityRecord(person: TalentPerson): TalentCapacityRecord {
  const c = person.candidate;
  const d = person.details;
  return {
    id: c.id, fullName: c.fullName, role: c.role, skills: [...c.skills, ...c.technologies.filter((t) => !c.skills.includes(t))],
    seniority: c.seniority, hourlyCost: person.hourlyCost, costCurrency: person.costCurrency, costIsPersonSpecific: person.costIsPersonSpecific,
    availability: c.availability, availableFrom: d.availableFrom, maxMonthlyHours: d.maxMonthlyHours,
    preferredMonthlyHours: d.preferredMonthlyHours, benchStatus: d.benchStatus, engagementType: person.engagementType,
    pricingModel: d.pricingModel, fixedPrice: d.fixedPrice, marginPercent: d.marginPercent, unitPrice: d.unitPrice, unitLabel: d.unitLabel,
  };
}
