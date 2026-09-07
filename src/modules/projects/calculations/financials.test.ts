import { describe, expect, it } from "vitest";

import { actualLabourCost, computeFinancials, forecastLabourCost, grossMargin, type FinancialInputs } from "./financials";

const project = { currency: "CZK" as const, baselineRevenue: 300000, baselineDirectCost: 120000 };
const members: FinancialInputs["members"] = [
  { id: "m1", status: "active", plannedHours: 40, costRate: 1000 },
  { id: "m2", status: "active", plannedHours: null, costRate: 800 },
  { id: "m3", status: "active", plannedHours: 10, costRate: null }, // no rate snapshot
];

describe("grossMargin", () => {
  it("is null without revenue", () => {
    expect(grossMargin(0, 100)).toBeNull();
    expect(grossMargin(300000, 120000)).toBeCloseTo(60);
  });
});

describe("actual labour cost", () => {
  it("multiplies actual hours by the member rate SNAPSHOT and reports unpriced hours", () => {
    const tasks = [
      { assigneeMemberId: "m1", estimatedHours: 20, actualHours: 12 },
      { assigneeMemberId: "m2", estimatedHours: 10, actualHours: 5 },
      { assigneeMemberId: "m3", estimatedHours: 5, actualHours: 3 },
      { assigneeMemberId: null, estimatedHours: 5, actualHours: 2 },
    ];
    const r = actualLabourCost(members, tasks);
    expect(r.cost).toBe(12 * 1000 + 5 * 800);
    expect(r.unpricedHours).toBe(5);
  });
});

describe("forecast labour cost", () => {
  it("uses max(actual, planned, estimated) per member and skips removed members", () => {
    const tasks = [
      { assigneeMemberId: "m1", estimatedHours: 20, actualHours: 50 }, // actual exceeds plan
      { assigneeMemberId: "m2", estimatedHours: 30, actualHours: 5 },  // no plan → estimated
    ];
    expect(forecastLabourCost(members, tasks)).toBe(50 * 1000 + 30 * 800);
    expect(forecastLabourCost([{ id: "m1", status: "removed", plannedHours: 40, costRate: 1000 }], tasks)).toBe(0);
  });
});

describe("computeFinancials", () => {
  it("keeps baseline, current and forecast separate", () => {
    const f = computeFinancials({
      project,
      members,
      tasks: [{ assigneeMemberId: "m1", estimatedHours: 40, actualHours: 20 }],
      costs: [{ estimatedCost: 10000, actualCost: 12000 }, { estimatedCost: 5000, actualCost: null }],
      changeRequests: [
        { status: "approved", additionalRevenue: 45000, additionalDirectCost: 10000 },
        { status: "draft", additionalRevenue: 99999, additionalDirectCost: 99999 },
      ],
    });
    // Baseline = what we sold, untouched by anything else.
    expect(f.baseline).toEqual({ revenue: 300000, directCost: 120000, grossProfit: 180000, grossMargin: 60 });
    // Approved changes only.
    expect(f.approvedChanges).toEqual({ count: 1, revenue: 45000, directCost: 10000 });
    expect(f.current.revenue).toBe(345000);
    // Current = actual labour (20h × 1000) + actual fixed (12000).
    expect(f.current.actualLabourCost).toBe(20000);
    expect(f.current.actualFixedCost).toBe(12000);
    expect(f.current.directCost).toBe(32000);
    // Forecast = labour max(20, 40, 40)×1000 + fixed max(10000,12000)+max(5000,0) + CR cost.
    expect(f.forecast.labourCost).toBe(40000);
    expect(f.forecast.fixedCost).toBe(17000);
    expect(f.forecast.directCost).toBe(40000 + 17000 + 10000);
    expect(f.forecast.basis).toBe("activity");
    expect(f.forecast.grossMargin).toBeCloseTo(((345000 - 67000) / 345000) * 100);
  });

  it("falls back to the baseline when nothing is planned yet", () => {
    const f = computeFinancials({ project, members: [], tasks: [], costs: [], changeRequests: [] });
    expect(f.forecast.basis).toBe("baseline");
    expect(f.forecast.directCost).toBe(120000);
    expect(f.current.directCost).toBe(0);
  });

  it("baseline does not change when a pricing estimate would change later", () => {
    // The project stores its own baseline numbers; recomputing with the same project rows yields the same baseline
    // regardless of any estimate. (Estimate edits never flow into these inputs.)
    const a = computeFinancials({ project, members: [], tasks: [], costs: [], changeRequests: [] });
    const b = computeFinancials({ project: { ...project }, members, tasks: [{ assigneeMemberId: "m1", estimatedHours: 10, actualHours: 100 }], costs: [], changeRequests: [] });
    expect(b.baseline).toEqual(a.baseline);
  });
});
