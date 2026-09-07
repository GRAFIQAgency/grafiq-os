import { describe, expect, it } from "vitest";

import type { CompanyLead } from "@/modules/sourcing/types";

import type { CrmStage, Deal, DealDetails } from "../types";
import { effectiveProbability, emptyDetails, isOverdue, matchesFilters, pipelineStats, sortDeals, stageTransition, toDeal } from "./pipeline";

const TODAY = new Date("2026-09-07T10:00:00Z");

function company(over: Partial<CompanyLead> = {}): CompanyLead {
  return {
    id: "c1", createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z", name: "Verdant Group", domain: "verdant.example", website: "https://verdant.example",
    logoUrl: null, registrationId: null, industry: "E-commerce", country: "Germany", city: "Berlin", employeeCount: 61, sizeBucket: "51-200", revenue: null,
    revenueCurrency: null, foundedYear: null, description: null, technologies: [], keywords: [], businessModel: null, companyType: null, language: null,
    status: "shortlisted", crmStatus: "prospect", crmAddedAt: "2026-08-01T00:00:00Z", tags: [], leadScore: 86, manualScore: null,
    firstDiscoveredAt: "2026-08-01T00:00:00Z", lastCheckedAt: "2026-08-01T00:00:00Z", ...over,
  };
}

function details(over: Partial<DealDetails> = {}): DealDetails {
  return { ...emptyDetails("c1"), ...over };
}

function deal(stage: CrmStage, over: Partial<DealDetails> = {}, co: Partial<CompanyLead> = {}): Deal {
  return toDeal(company({ crmStatus: stage, ...co }), details(over), {}, TODAY);
}

describe("probability and weighted value", () => {
  it("uses the stage default unless overridden", () => {
    expect(effectiveProbability("prospect", null)).toBe(10);
    expect(effectiveProbability("proposal", null)).toBe(60);
    expect(effectiveProbability("proposal", 75)).toBe(75);
  });

  it("closed stages ignore custom probability", () => {
    expect(effectiveProbability("customer", 30)).toBe(100);
    expect(effectiveProbability("lost", 90)).toBe(0);
  });

  it("weights the deal value by probability", () => {
    const d = deal("negotiation", { dealValue: 10_000, dealCurrency: "EUR" });
    expect(d.probability).toBe(80);
    expect(d.weightedValue).toBe(8_000);
    expect(deal("qualified").weightedValue).toBeNull();
  });
});

describe("next action and age", () => {
  it("flags overdue next actions only on open deals", () => {
    expect(isOverdue("2026-09-06", TODAY)).toBe(true);
    expect(isOverdue("2026-09-07", TODAY)).toBe(false);
    expect(deal("contacted", { nextActionAt: "2026-09-01" }).nextActionOverdue).toBe(true);
    expect(deal("customer", { nextActionAt: "2026-09-01" }).nextActionOverdue).toBe(false);
  });

  it("counts days since the company entered CRM", () => {
    expect(deal("prospect").ageDays).toBe(37);
  });
});

describe("stage transitions", () => {
  it("stamps won / lost and clears them when reopened", () => {
    const now = new Date("2026-09-07T12:00:00Z");
    expect(stageTransition("customer", null, now)).toEqual({ won_at: now.toISOString(), lost_at: null, lost_reason: null });
    expect(stageTransition("lost", "Budget cut", now)).toEqual({ lost_at: now.toISOString(), won_at: null, lost_reason: "Budget cut" });
    expect(stageTransition("qualified", null, now)).toEqual({ won_at: null, lost_at: null, lost_reason: null });
  });
});

describe("filters", () => {
  it("hides closed deals by default but shows them when asked or when filtering by their stage", () => {
    expect(matchesFilters(deal("customer"), {})).toBe(false);
    expect(matchesFilters(deal("customer"), { includeClosed: true })).toBe(true);
    expect(matchesFilters(deal("lost"), { stage: "lost" })).toBe(true);
    expect(matchesFilters(deal("prospect"), {})).toBe(true);
  });

  it("matches owner, overdue, country, industry and free text", () => {
    const d = deal("proposal", { ownerId: "u1", nextActionAt: "2026-08-30", nextStep: "Send revised proposal" });
    expect(matchesFilters(d, { ownerId: "u1" })).toBe(true);
    expect(matchesFilters(d, { ownerId: "u2" })).toBe(false);
    expect(matchesFilters(d, { overdueOnly: true })).toBe(true);
    expect(matchesFilters(d, { country: "germ" })).toBe(true);
    expect(matchesFilters(d, { industry: "SaaS" })).toBe(false);
    expect(matchesFilters(d, { q: "verdant proposal" })).toBe(true);
    expect(matchesFilters(d, { q: "helios" })).toBe(false);
  });
});

describe("sorting", () => {
  const a = deal("prospect", { nextActionAt: "2026-09-01", dealValue: 500, dealCurrency: "EUR" }, { id: "a", name: "Alpha" });
  const b = deal("negotiation", { nextActionAt: "2026-09-20", dealValue: 9_000, dealCurrency: "EUR" }, { id: "b", name: "Beta" });
  const c = deal("qualified", {}, { id: "c", name: "Gamma", leadScore: 95 });
  const won = deal("customer", { dealValue: 20_000, dealCurrency: "EUR" }, { id: "w", name: "Won Co" });

  it("puts overdue first, then nearest next action, then no date; closed last", () => {
    expect(sortDeals([won, c, b, a], "next_action").map((d) => d.company.id)).toEqual(["a", "b", "c", "w"]);
  });

  it("sorts by value, weighted value, score and name", () => {
    expect(sortDeals([a, b, c], "value").map((d) => d.company.id)).toEqual(["b", "a", "c"]);
    expect(sortDeals([a, b, c], "weighted").map((d) => d.company.id)).toEqual(["b", "a", "c"]);
    expect(sortDeals([a, b, c], "score").map((d) => d.company.id)).toEqual(["c", "a", "b"]);
    expect(sortDeals([c, b, a], "name").map((d) => d.company.id)).toEqual(["a", "b", "c"]);
  });
});

describe("pipeline stats", () => {
  it("sums open values per currency, counts overdue and this month's outcomes", () => {
    const stats = pipelineStats([
      deal("proposal", { dealValue: 1_000, dealCurrency: "EUR", nextActionAt: "2026-09-01" }),
      deal("qualified", { dealValue: 50_000, dealCurrency: "CZK" }),
      deal("customer", { dealValue: 4_000, dealCurrency: "EUR", wonAt: "2026-09-03T00:00:00Z" }),
      deal("lost", { lostAt: "2026-08-20T00:00:00Z" }),
    ], TODAY);
    expect(stats.openDeals).toBe(2);
    expect(stats.openValue).toEqual({ EUR: 1_000, CZK: 50_000 });
    expect(stats.weightedValue).toEqual({ EUR: 600, CZK: 20_000 });
    expect(stats.overdueActions).toBe(1);
    expect(stats.wonThisMonth).toBe(1);
    expect(stats.lostThisMonth).toBe(0);
    expect(stats.byStage.proposal).toBe(1);
    expect(stats.byStage.lost).toBe(1);
  });
});
