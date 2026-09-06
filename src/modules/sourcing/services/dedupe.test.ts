import { describe, expect, it } from "vitest";

import { MERGE_THRESHOLD, companyKeys, matchCompany, matchTalent, mergeRecords, talentKeys } from "./dedupe";
import { nameLocationKey, normalizeDomain, normalizeEmail, normalizeUrl } from "./normalize";

describe("normalisation keys", () => {
  it("normalises emails and rejects invalid ones", () => {
    expect(normalizeEmail("  Anna.Novak@Example.COM ")).toBe("anna.novak@example.com");
    expect(normalizeEmail("not-an-email")).toBeNull();
  });

  it("normalises urls ignoring protocol, www, query and trailing slash", () => {
    expect(normalizeUrl("https://www.Behance.net/anna/")).toBe("behance.net/anna");
    expect(normalizeUrl("behance.net/anna?ref=x#top")).toBe("behance.net/anna");
  });

  it("extracts domains", () => {
    expect(normalizeDomain("https://www.Example.com/about")).toBe("example.com");
    expect(normalizeDomain("example")).toBeNull();
  });

  it("builds name+location keys ignoring legal suffixes and diacritics", () => {
    expect(nameLocationKey("Kavka Studio s.r.o.", "Czech Republic", "Praha")).toBe("kavka studio|praha");
    expect(nameLocationKey("Anna Nováková", "Czech Republic")).toBe("anna novakova|czech republic");
  });
});

describe("talent matching", () => {
  const a = talentKeys({ fullName: "Anna Novak", email: "anna@example.com", profileUrl: "https://profiles.example/anna", portfolioUrl: null as unknown as undefined, country: "Czech Republic", city: "Prague" });

  it("matches on email with very high confidence", () => {
    const b = talentKeys({ fullName: "A. Novak", email: "ANNA@example.com", country: "Germany" });
    const m = matchTalent(a, b);
    expect(m.confidence).toBeGreaterThanOrEqual(MERGE_THRESHOLD);
    expect(m.reasons).toContain("email");
  });

  it("matches on profile url", () => {
    const b = talentKeys({ fullName: "Anna N.", profileUrl: "profiles.example/anna/" });
    expect(matchTalent(a, b).reasons).toContain("profile_url");
  });

  it("matches on name + location at the threshold", () => {
    const b = talentKeys({ fullName: "Anna Novák", country: "Czech Republic", city: "Prague" });
    const m = matchTalent(a, b);
    expect(m.confidence).toBe(0.8);
    expect(m.reasons).toEqual(["name_location"]);
  });

  it("does not match different people", () => {
    const b = talentKeys({ fullName: "Jakub Dvorak", email: "jakub@example.com", city: "Brno" });
    expect(matchTalent(a, b).confidence).toBe(0);
  });
});

describe("company matching", () => {
  const a = companyKeys({ name: "Kavka Studio s.r.o.", website: "https://www.kavka.example", registrationId: "123 45 678", country: "Czech Republic", city: "Prague" });

  it("matches on domain", () => {
    const b = companyKeys({ name: "KAVKA", website: "kavka.example/contact" });
    expect(matchCompany(a, b).reasons).toContain("domain");
  });

  it("matches on registration id ignoring whitespace", () => {
    const b = companyKeys({ name: "Something else", registrationId: "12345678" });
    expect(matchCompany(a, b).confidence).toBeGreaterThanOrEqual(0.99);
  });

  it("matches on name + location", () => {
    const b = companyKeys({ name: "Kavka Studio", country: "Czech Republic", city: "Prague" });
    expect(matchCompany(a, b).reasons).toEqual(["name_location"]);
  });
});

describe("mergeRecords", () => {
  it("fills empty fields, unions arrays and reports conflicts without overwriting", () => {
    const existing = { name: "Anna", city: "Prague", years: 5, skills: ["Webflow"], summary: null as string | null };
    const incoming = { city: "Brno", years: 5, skills: ["GSAP", "webflow"], summary: "Hi" };
    const { merged, conflicts } = mergeRecords(existing, incoming);
    expect(merged.city).toBe("Prague");
    expect(merged.summary).toBe("Hi");
    expect(merged.skills).toEqual(["Webflow", "GSAP"]);
    expect(conflicts).toEqual([{ field: "city", existing: "Prague", incoming: "Brno" }]);
  });
});
