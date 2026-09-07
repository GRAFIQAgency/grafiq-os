import { describe, expect, it } from "vitest";

import type { TalentCandidate } from "@/modules/sourcing/types";

import type { BenchDetails, TalentPerson } from "../types";
import { archiveTransition, defaultDetails, isAvailableForWork, matchesFilters, restoreTransition, sortPeople, toCapacityRecord, toTalentPerson } from "./bench";

const candidate = (over: Partial<TalentCandidate> = {}): TalentCandidate => ({
  id: "p1", createdAt: "", updatedAt: "", fullName: "Anna Novak", headline: null, role: "Webflow Developer", email: null,
  profileUrl: null, portfolioUrl: null, avatarUrl: null, country: "Czech Republic", city: "Prague", remote: true,
  seniority: "senior", employmentType: "freelancer", hourlyRateMin: 40, hourlyRateMax: 50, rateCurrency: "EUR",
  availability: "available", yearsExperience: 6, agencyExperience: true, skills: ["Webflow", "GSAP"], technologies: ["Figma"],
  languages: [], summary: null, status: "shortlisted", inTalentBench: true, benchAddedAt: "2026-09-01T00:00:00Z", tags: [],
  ratings: { quality: 8, reliability: 9 }, aiScore: 80, manualScore: null, firstDiscoveredAt: "", lastCheckedAt: "", ...over,
});

const details = (over: Partial<BenchDetails> = {}): BenchDetails => ({ ...defaultDetails("p1"), ...over });

describe("toTalentPerson", () => {
  it("uses the person-specific cost when set, else the sourcing rate", () => {
    const withCost = toTalentPerson(candidate(), details({ hourlyCost: 35, costCurrency: "CZK" }));
    expect(withCost.hourlyCost).toBe(35);
    expect(withCost.costCurrency).toBe("CZK");
    expect(withCost.costIsPersonSpecific).toBe(true);

    const fallback = toTalentPerson(candidate(), null);
    expect(fallback.hourlyCost).toBe(40);
    expect(fallback.costCurrency).toBe("EUR");
    expect(fallback.costIsPersonSpecific).toBe(false);
  });

  it("derives engagement type from sourcing employment type when not set", () => {
    expect(toTalentPerson(candidate(), null).engagementType).toBe("freelancer");
    expect(toTalentPerson(candidate(), details({ engagementType: "part_time" })).engagementType).toBe("part_time");
  });

  it("ignores details that belong to a different person", () => {
    const wrong = details({ talentCandidateId: "someone-else", hourlyCost: 999, benchStatus: "preferred" });
    const p = toTalentPerson(candidate(), wrong);
    expect(p.hourlyCost).toBe(40);
    expect(p.details.talentCandidateId).toBe("p1");
    expect(p.preferred).toBe(false);
  });

  it("reuses sourcing ratings instead of a second rating system", () => {
    expect(toTalentPerson(candidate(), null).ratings).toEqual({ quality: 8, reliability: 9 });
  });
});

describe("isAvailableForWork", () => {
  const today = new Date("2026-09-07");
  it("requires bench membership, a staffable status and availability", () => {
    expect(isAvailableForWork(toTalentPerson(candidate(), null), today)).toBe(true);
    expect(isAvailableForWork(toTalentPerson(candidate({ inTalentBench: false }), null), today)).toBe(false);
    expect(isAvailableForWork(toTalentPerson(candidate(), details({ benchStatus: "paused" })), today)).toBe(false);
    expect(isAvailableForWork(toTalentPerson(candidate({ availability: "unavailable" }), null), today)).toBe(false);
  });

  it("respects a future start date", () => {
    expect(isAvailableForWork(toTalentPerson(candidate(), details({ availableFrom: "2026-10-01" })), today)).toBe(false);
    expect(isAvailableForWork(toTalentPerson(candidate(), details({ availableFrom: "2026-09-01" })), today)).toBe(true);
  });
});

describe("archive / restore", () => {
  it("only flips lifecycle fields and never deletes anything", () => {
    expect(archiveTransition()).toEqual({ candidate: { in_talent_bench: false }, details: { bench_status: "archived" } });
    expect(restoreTransition()).toEqual({ candidate: { in_talent_bench: true }, details: { bench_status: "active" } });
  });
});

describe("filters and sorting", () => {
  const anna = toTalentPerson(candidate(), details({ benchStatus: "preferred" }));
  const jakub = toTalentPerson(candidate({ id: "p2", fullName: "Jakub Dvorak", role: "Front-end Developer", availability: "limited", hourlyRateMin: 60, ratings: { quality: 6 }, country: "Germany", seniority: "mid" }), { ...defaultDetails("p2"), engagementType: "contractor" });

  it("filters by status, availability, preferred, engagement and rate range", () => {
    expect(matchesFilters(anna, { preferredOnly: true })).toBe(true);
    expect(matchesFilters(jakub, { preferredOnly: true })).toBe(false);
    expect(matchesFilters(jakub, { availability: "limited" })).toBe(true);
    expect(matchesFilters(anna, { availability: "limited" })).toBe(false);
    expect(matchesFilters(jakub, { engagementType: "contractor" })).toBe(true);
    expect(matchesFilters(anna, { rateMin: 50 })).toBe(false);
    expect(matchesFilters(jakub, { rateMin: 50, rateMax: 70 })).toBe(true);
    expect(matchesFilters(anna, { status: "preferred", skills: ["gsap"], country: "Czech Republic", q: "webflow prague" })).toBe(true);
  });

  it("sorts by quality, cost, availability and name", () => {
    expect(sortPeople([jakub, anna], "quality").map((p) => p.candidate.id)).toEqual(["p1", "p2"]);
    expect(sortPeople([jakub, anna], "cost").map((p) => p.candidate.id)).toEqual(["p1", "p2"]);
    expect(sortPeople([jakub, anna], "availability").map((p) => p.candidate.id)).toEqual(["p1", "p2"]);
    expect(sortPeople([jakub, anna], "name").map((p) => p.candidate.fullName)).toEqual(["Anna Novak", "Jakub Dvorak"]);
  });
});

describe("toCapacityRecord", () => {
  it("exposes what Projects / Capacity / Pricing need, keyed by the shared person id", () => {
    const person: TalentPerson = toTalentPerson(candidate(), details({ hourlyCost: 45, costCurrency: "EUR", maxMonthlyHours: 120 }));
    expect(toCapacityRecord(person)).toMatchObject({ id: "p1", role: "Webflow Developer", hourlyCost: 45, costIsPersonSpecific: true, maxMonthlyHours: 120, benchStatus: "active", skills: ["Webflow", "GSAP", "Figma"] });
  });
});
