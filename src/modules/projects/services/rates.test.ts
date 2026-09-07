import { describe, expect, it } from "vitest";

import type { RoleCost } from "@/modules/settings/types";

import type { PersonOption } from "../types";
import { suggestRate } from "./rates";

const roleCosts: RoleCost[] = [
  { id: "r1", name: "Designer", hourlyCost: 900, currency: "CZK", isActive: true, position: 0 },
  { id: "r2", name: "Developer", hourlyCost: 1100, currency: "CZK", isActive: false, position: 1 },
];
const person = (over: Partial<PersonOption>): PersonOption => ({ id: "p1", kind: "talent", label: "Anna", role: "Designer", hourlyCost: null, currency: null, costIsPersonSpecific: false, ...over });

describe("suggestRate", () => {
  it("prefers the person's own Talent cost", () => {
    expect(suggestRate(person({ hourlyCost: 45, currency: "EUR", costIsPersonSpecific: true }), "Designer", roleCosts)).toEqual({ rate: 45, currency: "EUR", source: "talent" });
  });
  it("falls back to the active Settings role default by project role, then by the person's role", () => {
    expect(suggestRate(person({}), "designer", roleCosts)).toEqual({ rate: 900, currency: "CZK", source: "role_default" });
    expect(suggestRate(person({ role: "Designer" }), "Motion", roleCosts)).toEqual({ rate: 900, currency: "CZK", source: "role_default" });
    expect(suggestRate(person({ role: "Developer" }), "Developer", roleCosts).source).toBe("manual"); // inactive role cost ignored
  });
  it("uses a sourcing rate before giving up, and returns manual when nothing is known", () => {
    expect(suggestRate(person({ role: "Copywriter", hourlyCost: 30, currency: "EUR" }), "Copywriter", roleCosts)).toEqual({ rate: 30, currency: "EUR", source: "talent" });
    expect(suggestRate(null, "Nothing", roleCosts)).toEqual({ rate: null, currency: null, source: "manual" });
  });
});
