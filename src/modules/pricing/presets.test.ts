import { describe, expect, it } from "vitest";

import { presetOptions, resolvePreset } from "./presets";
import type { PersonPreset, RolePreset } from "./types";

const roles: RolePreset[] = [
  { name: "Developer", hourlyCost: 1100, currency: "CZK" },
  { name: "3D Designer", hourlyCost: 1000, currency: "CZK" },
];
const person = (over: Partial<PersonPreset> & Pick<PersonPreset, "id" | "name">): PersonPreset => ({
  role: null, pricingModel: "hourly", hourlyCost: null, fixedPrice: null, marginPercent: null, unitPrice: null, unitLabel: null, currency: null, ...over,
});
const people: PersonPreset[] = [
  person({ id: "p1", name: "Jana Nováková", role: "Developer", hourlyCost: 950, currency: "CZK" }),
  person({ id: "p2", name: "Petr Smolin", role: "3D Designer", hourlyCost: 500, currency: "CZK" }),
  person({ id: "p3", name: "Tomáš Kraus", role: "Developer" }),
  person({ id: "p4", name: "Mia Berg", role: "Developer", hourlyCost: 60, currency: "EUR" }),
  person({ id: "p5", name: "Ota Fix", role: "3D Designer", pricingModel: "fixed", fixedPrice: 12000, currency: "CZK" }),
  person({ id: "p6", name: "Sara Sales", role: "Sales", pricingModel: "percent", marginPercent: 10 }),
  person({ id: "p7", name: "Uma Unit", role: "3D Designer", pricingModel: "unit", unitPrice: 500, unitLabel: "model", currency: "CZK" }),
];
const labels = { roleDefault: "role default", perHour: "/h", noRate: "no rate", fixedPerProject: "fixed", ofPrice: "of price", perUnit: "pcs" };

describe("resolvePreset", () => {
  it("fills a person's own rate, case-insensitively", () => {
    expect(resolvePreset("  jana nováková ", people, roles, "CZK")).toEqual({ kind: "person", name: "Jana Nováková", role: "Developer", payModel: "hourly", hourlyCost: 950, fixedPrice: null, percent: null, unitCost: null, unitLabel: null });
  });

  it("falls back to the role default when the person has no rate", () => {
    expect(resolvePreset("Tomáš Kraus", people, roles, "CZK")?.hourlyCost).toBe(1100);
  });

  it("does not mix currencies", () => {
    expect(resolvePreset("Mia Berg", people, roles, "CZK")?.hourlyCost).toBe(1100); // own EUR rate ignored, CZK role default used
    expect(resolvePreset("Mia Berg", people, roles, "EUR")?.hourlyCost).toBe(60);
    expect(resolvePreset("Developer", people, roles, "EUR")?.hourlyCost).toBeNull();
  });

  it("resolves role defaults and unknown names", () => {
    expect(resolvePreset("developer", people, roles, "CZK")).toEqual({ kind: "role", name: "Developer", role: "Developer", payModel: "hourly", hourlyCost: 1100, fixedPrice: null, percent: null, unitCost: null, unitLabel: null });
    expect(resolvePreset("Somebody", people, roles, "CZK")).toBeNull();
    expect(resolvePreset("", people, roles, "CZK")).toBeNull();
  });

  it("carries fixed and percent pay models with their values", () => {
    expect(resolvePreset("Ota Fix", people, roles, "CZK")).toMatchObject({ payModel: "fixed", fixedPrice: 12000, hourlyCost: 1000 });
    expect(resolvePreset("Ota Fix", people, roles, "EUR")?.fixedPrice).toBeNull();
    expect(resolvePreset("Sara Sales", people, roles, "CZK")).toMatchObject({ payModel: "percent", percent: 10, hourlyCost: null });
    expect(resolvePreset("Uma Unit", people, roles, "CZK")).toMatchObject({ payModel: "unit", unitCost: 500, unitLabel: "model" });
    expect(resolvePreset("Uma Unit", people, roles, "EUR")?.unitCost).toBeNull();
  });
});

describe("presetOptions", () => {
  it("lists people (grouped by role) before role defaults, with pay model and rate", () => {
    const opts = presetOptions(people, roles, "CZK", labels);
    expect(opts.map((o) => o.value)).toEqual(["Ota Fix", "Petr Smolin", "Uma Unit", "Jana Nováková", "Mia Berg", "Tomáš Kraus", "Sara Sales", "Developer", "3D Designer"]);
    expect(opts[0].label).toBe("3D Designer · fixed · 12000 CZK");
    expect(opts[1].label).toBe("3D Designer · 500 CZK/h");
    expect(opts[2].label).toBe("3D Designer · 500 CZK / model");
    expect(opts[6].label).toBe("Sales · 10 % of price");
    expect(opts[7].label).toBe("role default · 1100 CZK/h");
  });
});
