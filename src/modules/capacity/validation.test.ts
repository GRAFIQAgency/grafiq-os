import { describe, expect, it } from "vitest";

import { parseCapacityFilters, parseHorizon, parsePeriodKind, parseView, parseWhatIf } from "./services/filters";
import { validateInternalCapacity } from "./validation";

const msg = { hoursRange: "range", invalidNumber: "num", tooLong: "long" };

describe("validateInternalCapacity", () => {
  it("accepts a form submission", () => {
    expect(validateInternalCapacity({ monthlyCapacityHours: "120", preferredMonthlyHours: "", capacityActive: "on", notes: " part-time Fridays " }, msg).data)
      .toEqual({ monthlyCapacityHours: 120, preferredMonthlyHours: null, capacityActive: true, notes: "part-time Fridays" });
  });

  it("requires monthly hours within 0–744 and treats a missing checkbox as inactive", () => {
    expect(validateInternalCapacity({ monthlyCapacityHours: "" }, msg).errors?.fieldErrors).toEqual({ monthlyCapacityHours: "range" });
    expect(validateInternalCapacity({ monthlyCapacityHours: "800" }, msg).errors?.fieldErrors).toEqual({ monthlyCapacityHours: "range" });
    expect(validateInternalCapacity({ monthlyCapacityHours: "100", preferredMonthlyHours: "x" }, msg).errors?.fieldErrors).toEqual({ preferredMonthlyHours: "range" });
    expect(validateInternalCapacity({ monthlyCapacityHours: "100" }, msg).data?.capacityActive).toBe(false);
  });
});

describe("URL params", () => {
  it("parses filters, view, kind and horizon", () => {
    expect(parseCapacityFilters({ q: "petr", kind: "user", overloaded: "1", free: "0", project: "p1", availability: "bogus" }))
      .toEqual({ q: "petr", kind: "user", overloadedOnly: true, projectId: "p1" });
    expect(parseView({ view: "projects" })).toBe("projects");
    expect(parseView({})).toBe("people");
    expect(parsePeriodKind({ kind: "week" })).toBe("week");
    expect(parseHorizon({ horizon: "6" })).toBe(6);
    expect(parseHorizon({ horizon: "9" })).toBe(4);
  });

  it("parses a what-if request only when complete", () => {
    expect(parseWhatIf({ wiHours: "60", wiFrom: "2026-10-01", wiTo: "2026-10-31", wiPerson: "talent:p1" }))
      .toEqual({ personKey: "talent:p1", role: undefined, hours: 60, start: "2026-10-01", end: "2026-10-31" });
    expect(parseWhatIf({ wiHours: "60", wiFrom: "2026-10-01", wiTo: "2026-10-31", wiRole: "Webflow" })?.role).toBe("Webflow");
    expect(parseWhatIf({ wiHours: "0", wiFrom: "2026-10-01", wiTo: "2026-10-31", wiRole: "Webflow" })).toBeNull();
    expect(parseWhatIf({ wiHours: "10", wiFrom: "1.10.2026", wiTo: "2026-10-31", wiRole: "Webflow" })).toBeNull();
    expect(parseWhatIf({ wiHours: "10", wiFrom: "2026-10-01", wiTo: "2026-10-31" })).toBeNull();
  });
});
