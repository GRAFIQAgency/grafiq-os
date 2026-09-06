import { describe, expect, it } from "vitest";

import { csvRowToCompany, csvRowToTalent, parseCsv } from "./csv";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes and CRLF", () => {
    const rows = parseCsv('name,note\r\n"Kavka, s.r.o.","She said ""hi"""\r\nOrbis,plain\r\n');
    expect(rows).toEqual([
      { name: "Kavka, s.r.o.", note: 'She said "hi"' },
      { name: "Orbis", note: "plain" },
    ]);
  });

  it("normalises headers and skips blank lines", () => {
    const rows = parseCsv("Full Name, Hourly Rate Min\n\nAnna,40\n");
    expect(rows).toEqual([{ full_name: "Anna", hourly_rate_min: "40" }]);
  });

  it("returns nothing without a data row", () => {
    expect(parseCsv("name\n")).toEqual([]);
  });
});

describe("row mappers", () => {
  it("maps a talent row with lists and enums", () => {
    const t = csvRowToTalent({ full_name: "Anna Novak", email: "Anna@x.com", seniority: "Senior", skills: "Webflow; GSAP", remote: "yes", hourly_rate_min: "45", rate_currency: "eur" }, 0);
    expect(t).toMatchObject({ fullName: "Anna Novak", seniority: "senior", skills: ["Webflow", "GSAP"], remote: true, hourlyRateMin: 45, rateCurrency: "EUR", sourceEntityId: "email:anna@x.com" });
  });

  it("skips talent rows without a name", () => {
    expect(csvRowToTalent({ email: "x@y.com" }, 3)).toBeNull();
  });

  it("maps a company row with signals", () => {
    const c = csvRowToCompany({ name: "Orbis", website: "orbis.example", employee_count: "42", company_type: "SaaS", signals: "hiring_marketing;old_website" }, 0);
    expect(c).toMatchObject({ name: "Orbis", employeeCount: 42, companyType: "saas" });
    expect(c?.signals?.map((s) => s.type)).toEqual(["hiring_marketing", "old_website"]);
  });
});
