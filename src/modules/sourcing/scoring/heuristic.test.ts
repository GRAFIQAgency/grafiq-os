import { describe, expect, it } from "vitest";

import type { CompanyLead, CompanySignal, RoleProfile, TalentCandidate } from "../types";
import { heuristicLeadScore, heuristicTalentScore } from "./heuristic";

const baseCandidate: TalentCandidate = {
  id: "c1", createdAt: "", updatedAt: "", fullName: "Anna Novak", headline: "Senior Webflow Developer",
  role: "Webflow Developer", email: null, profileUrl: null, portfolioUrl: "https://p.example/anna", avatarUrl: null,
  country: "Czech Republic", city: "Prague", remote: true, seniority: "senior", employmentType: "freelancer",
  hourlyRateMin: 45, hourlyRateMax: 55, rateCurrency: "EUR", availability: "available", yearsExperience: 6,
  agencyExperience: true, skills: ["Webflow", "CMS", "Responsive", "JavaScript", "GSAP"], technologies: ["Webflow", "GSAP"],
  languages: ["English"], summary: null, status: "discovered", inTalentBench: false, benchAddedAt: null, tags: [],
  ratings: {}, aiScore: null, manualScore: null, firstDiscoveredAt: "", lastCheckedAt: "",
};

const profile: RoleProfile = {
  id: "p1", name: "Senior Webflow Developer", role: "Webflow Developer", description: null,
  requiredSkills: ["Webflow", "CMS", "Responsive", "JavaScript", "GSAP"], niceToHaveSkills: ["Figma", "SEO"],
  minYearsExperience: 4, preferredCountries: ["Czech Republic"], maxHourlyRate: 60, rateCurrency: "EUR",
  agencyExperiencePreferred: true, communicationExpectations: null, portfolioRequired: true, isActive: true,
};

describe("heuristicTalentScore", () => {
  it("scores a strong match highly with explanations", () => {
    const r = heuristicTalentScore(baseCandidate, profile);
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.strengths.join(" ")).toContain("required skills");
    expect(r.weaknesses).toEqual([]);
    expect(r.provider).toBe("heuristic");
  });

  it("penalises missing required skills, low experience and high rate", () => {
    const weak: TalentCandidate = { ...baseCandidate, skills: ["Webflow"], technologies: [], yearsExperience: 1, hourlyRateMin: 90, portfolioUrl: null, agencyExperience: false };
    const r = heuristicTalentScore(weak, profile);
    expect(r.score).toBeLessThan(50);
    expect(r.weaknesses.join(" ")).toContain("No evidence of");
    expect(r.weaknesses.join(" ")).toContain("Rate above budget");
  });

  it("reports missing information instead of guessing", () => {
    const unknown: TalentCandidate = { ...baseCandidate, yearsExperience: null, hourlyRateMin: null, hourlyRateMax: null, agencyExperience: null, availability: null };
    const r = heuristicTalentScore(unknown, profile);
    expect(r.missingInfo.length).toBeGreaterThanOrEqual(3);
  });

  it("works without a role profile", () => {
    const r = heuristicTalentScore(baseCandidate, null);
    expect(r.score).toBeGreaterThan(0);
    expect(r.missingInfo.join(" ")).toContain("No role profile");
  });
});

const baseLead: CompanyLead = {
  id: "l1", createdAt: "", updatedAt: "", name: "Orbis Software", domain: "orbis.example", website: "https://orbis.example",
  logoUrl: null, registrationId: null, industry: "SaaS", country: "Czech Republic", city: "Prague", employeeCount: 42,
  sizeBucket: "11-50", revenue: null, revenueCurrency: null, foundedYear: 2016, description: null, technologies: ["WordPress"],
  keywords: [], businessModel: "b2b", companyType: "saas", language: "cs", status: "discovered", crmStatus: null,
  crmAddedAt: null, tags: [], leadScore: null, manualScore: null, firstDiscoveredAt: "", lastCheckedAt: "",
};

const signal = (type: string, strength: CompanySignal["strength"] = "high"): CompanySignal => ({
  id: type, companyId: "l1", type, strength, confidence: 0.8, detectedAt: "", sourceId: null, description: null,
});

describe("heuristicLeadScore", () => {
  it("scores an ICP-fit company with strong signals highly", () => {
    const r = heuristicLeadScore(baseLead, [signal("hiring_marketing"), signal("old_website", "medium")]);
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.strengths.join(" ")).toContain("ideal size");
  });

  it("scores lower without signals and flags it", () => {
    const r = heuristicLeadScore(baseLead, []);
    expect(r.weaknesses.join(" ")).toContain("No buying signals");
    expect(r.score).toBeLessThan(heuristicLeadScore(baseLead, [signal("rebrand")]).score);
  });

  it("flags unknown data as missing information", () => {
    const r = heuristicLeadScore({ ...baseLead, employeeCount: null, industry: null, companyType: null }, []);
    expect(r.missingInfo.length).toBeGreaterThanOrEqual(3);
  });
});
