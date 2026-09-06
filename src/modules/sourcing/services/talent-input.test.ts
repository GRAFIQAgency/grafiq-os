import { describe, expect, it } from "vitest";

import { validateTalentInput, type TalentInputMessages } from "./talent-input";

const msg: TalentInputMessages = {
  nameRequired: "name", emailInvalid: "email", urlInvalid: "url", numberInvalid: "number", consentRequired: "consent", tooLong: "long",
};

describe("validateTalentInput", () => {
  it("normalises a valid submission", () => {
    const r = validateTalentInput({ fullName: " Anna Novak ", email: "Anna@X.com", portfolioUrl: "anna.dev", skills: "Webflow, GSAP", hourlyRateMin: "45", remote: "on", seniority: "senior" }, msg);
    expect(r.error).toBeUndefined();
    expect(r.data).toMatchObject({ fullName: "Anna Novak", email: "anna@x.com", portfolioUrl: "https://anna.dev/", skills: ["Webflow", "GSAP"], hourlyRateMin: 45, remote: true, seniority: "senior", sourceEntityId: "anna@x.com" });
  });

  it("collects field errors", () => {
    const r = validateTalentInput({ fullName: "", email: "nope", profileUrl: "ftp://x", hourlyRateMin: "abc" }, msg);
    expect(r.fieldErrors).toEqual({ fullName: "name", email: "email", profileUrl: "url", hourlyRateMin: "number" });
  });

  it("requires consent when asked", () => {
    expect(validateTalentInput({ fullName: "A" }, msg, { requireConsent: true }).fieldErrors).toEqual({ consent: "consent" });
    expect(validateTalentInput({ fullName: "A", consent: "on" }, msg, { requireConsent: true }).consent).toBe(true);
  });
});
