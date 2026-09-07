import { describe, expect, it } from "vitest";

import { validateChangeRequest, validateMember, validateProject, type ProjectValidationMessages } from "./validation";

const msg: ProjectValidationMessages = {
  nameRequired: "name", titleRequired: "title", invalidNumber: "num", invalidDate: "date", invalidUrl: "url", currency: "cur", personRequired: "person", roleRequired: "role", tooLong: "long", margin: "margin",
};

describe("validateProject", () => {
  it("applies Settings defaults and keeps the estimate id", () => {
    const r = validateProject({ name: "Web", estimateId: "e1", baselineRevenue: "300000", baselineDirectCost: "120000" }, msg, { currency: "EUR", targetMargin: 55 });
    expect(r.data).toMatchObject({ name: "Web", estimateId: "e1", currency: "EUR", baselineTargetMargin: 55, baselineRevenue: 300000, status: "draft", priority: "normal", projectType: "other" });
  });
  it("rejects bad dates and numbers", () => {
    expect(validateProject({ name: "x", deadline: "tomorrow", baselineRevenue: "abc" }, msg, { currency: "CZK", targetMargin: 60 }).errors?.fieldErrors).toEqual({ deadline: "date", baselineRevenue: "num" });
  });
});

describe("validateMember", () => {
  it("references a shared person by id (talent or user) instead of copying them", () => {
    expect(validateMember({ person: "talent:abc", projectRole: "Designer", costRate: "45", currency: "EUR", rateSource: "talent" }, msg).data).toMatchObject({ talentCandidateId: "abc", userId: null, costRate: 45, rateSource: "talent" });
    expect(validateMember({ person: "user:u1", projectRole: "PM" }, msg).data).toMatchObject({ talentCandidateId: null, userId: "u1", rateSource: "manual" });
    expect(validateMember({ person: "", projectRole: "PM" }, msg).errors?.fieldErrors).toEqual({ person: "person" });
  });
});

describe("validateChangeRequest", () => {
  it("parses economics with defaults", () => {
    expect(validateChangeRequest({ title: "Extra page", additionalRevenue: "45000", deadlineImpactDays: "5" }, msg).data).toMatchObject({ additionalRevenue: 45000, additionalDirectCost: 0, deadlineImpactDays: 5, status: "draft" });
  });
});
