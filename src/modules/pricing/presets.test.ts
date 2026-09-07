import { describe, expect, it } from "vitest";

import { presetOptions, resolvePreset } from "./presets";
import type { PersonPreset, RolePreset } from "./types";

const roles: RolePreset[] = [
  { name: "Developer", hourlyCost: 1100, currency: "CZK" },
  { name: "3D Designer", hourlyCost: 1000, currency: "CZK" },
];
const people: PersonPreset[] = [
  { id: "p1", name: "Jana Nováková", role: "Developer", hourlyCost: 950, currency: "CZK" },
  { id: "p2", name: "Petr Smolin", role: "3D Designer", hourlyCost: 500, currency: "CZK" },
  { id: "p3", name: "Tomáš Kraus", role: "Developer", hourlyCost: null, currency: null },
  { id: "p4", name: "Mia Berg", role: "Developer", hourlyCost: 60, currency: "EUR" },
];

describe("resolvePreset", () => {
  it("fills a person's own rate, case-insensitively", () => {
    expect(resolvePreset("  jana nováková ", people, roles, "CZK")).toEqual({ kind: "person", name: "Jana Nováková", hourlyCost: 950, role: "Developer" });
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
    expect(resolvePreset("developer", people, roles, "CZK")).toEqual({ kind: "role", name: "Developer", hourlyCost: 1100, role: "Developer" });
    expect(resolvePreset("Somebody", people, roles, "CZK")).toBeNull();
    expect(resolvePreset("", people, roles, "CZK")).toBeNull();
  });
});

describe("presetOptions", () => {
  it("lists people (grouped by role) before role defaults, with rates", () => {
    const opts = presetOptions(people, roles, "CZK", { roleDefault: "role default", perHour: "/h", noRate: "no rate" });
    expect(opts.map((o) => o.value)).toEqual(["Petr Smolin", "Jana Nováková", "Mia Berg", "Tomáš Kraus", "Developer", "3D Designer"]);
    expect(opts[0].label).toBe("3D Designer · 500 CZK/h");
    expect(opts[4].label).toBe("role default · 1100 CZK/h");
  });
});
