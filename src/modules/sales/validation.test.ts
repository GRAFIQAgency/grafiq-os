import { describe, expect, it } from "vitest";

import { validateContact, validateDealDetails, type DealValidationMessages } from "./validation";

const msg: DealValidationMessages = {
  invalidNumber: "num", invalidDate: "date", probabilityRange: "prob", tooLong: "long", nameRequired: "name", invalidEmail: "email", invalidUrl: "url",
};

describe("validateDealDetails", () => {
  it("accepts a normal form submission and normalises empty values to null", () => {
    const r = validateDealDetails({ ownerId: "u1", dealValue: "12 500,50", dealCurrency: "EUR", probability: "", expectedClose: "2026-10-01", nextActionAt: "", nextStep: "  Call Anna ", pricingEstimateId: "" }, msg);
    expect(r.errors).toBeUndefined();
    expect(r.data).toEqual({ ownerId: "u1", dealValue: 12500.5, dealCurrency: "EUR", probability: null, expectedClose: "2026-10-01", nextStep: "Call Anna", nextActionAt: null, pricingEstimateId: null });
  });

  it("rejects bad numbers, dates and probability out of range", () => {
    const r = validateDealDetails({ dealValue: "abc", probability: "120", expectedClose: "1.10.2026", nextActionAt: "2026-13-40" }, msg);
    expect(r.errors?.fieldErrors).toEqual({ dealValue: "num", probability: "prob", expectedClose: "date", nextActionAt: "date" });
  });

  it("ignores unknown currencies", () => {
    expect(validateDealDetails({ dealCurrency: "GBP" }, msg).data?.dealCurrency).toBeNull();
  });
});

describe("validateContact", () => {
  it("requires a name and validates email / url", () => {
    expect(validateContact({ name: " " }, msg).errors?.fieldErrors).toEqual({ name: "name" });
    expect(validateContact({ name: "Anna", email: "nope" }, msg).errors?.fieldErrors).toEqual({ email: "email" });
    expect(validateContact({ name: "Anna", profileUrl: "linkedin.com/in/anna" }, msg).errors?.fieldErrors).toEqual({ profileUrl: "url" });
  });

  it("returns a clean contact", () => {
    expect(validateContact({ name: "Anna Nová", jobTitle: "CMO", email: "anna@verdant.example", phone: "", profileUrl: "https://linkedin.com/in/anna" }, msg).data)
      .toEqual({ name: "Anna Nová", jobTitle: "CMO", email: "anna@verdant.example", phone: null, profileUrl: "https://linkedin.com/in/anna" });
  });
});
