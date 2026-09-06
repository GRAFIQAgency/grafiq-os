import { describe, expect, it } from "vitest";

import { companyFiltersToParams, parseCompanyFilters, parseListParams, parseTalentFilters, talentFiltersToParams } from "./filters";

describe("talent filters", () => {
  it("parses url params into typed filters", () => {
    const f = parseTalentFilters({ q: "webflow", seniority: "senior", rateMax: "60", skills: "Webflow, GSAP", remote: "1", bogus: "x" });
    expect(f).toEqual({ q: "webflow", seniority: "senior", rateMax: 60, skills: ["Webflow", "GSAP"], remote: true });
  });

  it("ignores invalid enum values and numbers", () => {
    const f = parseTalentFilters({ seniority: "guru", minYears: "abc" });
    expect(f).toEqual({});
  });

  it("round-trips through url params", () => {
    const f = parseTalentFilters({ role: "Webflow Developer", tech: "Webflow,GSAP", portfolio: "1", minScore: "70" });
    const params = talentFiltersToParams(f);
    expect(parseTalentFilters(Object.fromEntries(params))).toEqual(f);
  });
});

describe("company filters", () => {
  it("parses and round-trips", () => {
    const f = parseCompanyFilters({ country: "Czech Republic", type: "saas", employeesMin: "10", employeesMax: "200", signals: "hiring_marketing" });
    expect(f.companyType).toBe("saas");
    expect(parseCompanyFilters(Object.fromEntries(companyFiltersToParams(f)))).toEqual(f);
  });
});

describe("list params", () => {
  it("clamps page and page size", () => {
    expect(parseListParams({ page: "0", pageSize: "9999", sort: "score" })).toEqual({ page: 1, pageSize: 100, sort: "score" });
    expect(parseListParams({})).toEqual({ page: 1, pageSize: 25, sort: "newest" });
  });
});
