import { describe, expect, it } from "vitest";

import { actualLabourCost, computeFinancials, forecastLabourCost, grossMargin, type FinancialInputs } from "./financials";

const project = { currency: "CZK" as const, baselineRevenue: 300000, baselineDirectCost: 120000 };
const hourly = (m: Omit<FinancialInputs["members"][number], "payModel" | "fixedCost" | "percent" | "unitCost" | "plannedUnits" | "deliveredUnits">): FinancialInputs["members"][number] => ({ ...m, payModel: "hourly", fixedCost: null, percent: null, unitCost: null, plannedUnits: null, deliveredUnits: 0 });
const members: FinancialInputs["members"] = [
  hourly({ id: "m1", status: "active", plannedHours: 40, costRate: 1000 }),
  hourly({ id: "m2", status: "active", plannedHours: null, costRate: 800 }),
  hourly({ id: "m3", status: "active", plannedHours: 10, costRate: null }), // no rate snapshot
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
    expect(forecastLabourCost([hourly({ id: "m1", status: "removed", plannedHours: 40, costRate: 1000 })], tasks)).toBe(0);
  });
});

describe("pay models on a project", () => {
  const fixed: FinancialInputs["members"][number] = { id: "f1", status: "active", plannedHours: 30, costRate: 1000, payModel: "fixed", fixedCost: 12000, percent: null, unitCost: null, plannedUnits: null, deliveredUnits: 0 };
  const percent: FinancialInputs["members"][number] = { id: "p1", status: "active", plannedHours: 10, costRate: null, payModel: "percent", fixedCost: null, percent: 10, unitCost: null, plannedUnits: null, deliveredUnits: 0 };
  const unit: FinancialInputs["members"][number] = { id: "u1", status: "active", plannedHours: 600, costRate: null, payModel: "unit", fixedCost: null, percent: null, unitCost: 500, plannedUnits: 300, deliveredUnits: 120 };

  it("a unit-paid member costs delivered units now and max(delivered, planned) units in the forecast", () => {
    expect(actualLabourCost([unit], []).cost).toBe(120 * 500);
    expect(forecastLabourCost([unit], [])).toBe(300 * 500);
    expect(forecastLabourCost([{ ...unit, deliveredUnits: 340 }], [])).toBe(340 * 500);
    expect(actualLabourCost([unit], [{ assigneeMemberId: "u1", estimatedHours: 10, actualHours: 8 }]).unpricedHours).toBe(0);
  });

  it("a fixed-paid member costs the agreed fee regardless of hours; hourly rate is ignored", () => {
    const tasks = [{ assigneeMemberId: "f1", estimatedHours: 30, actualHours: 45 }];
    expect(forecastLabourCost([fixed], tasks)).toBe(12000);
    expect(actualLabourCost([fixed], tasks).cost).toBe(12000); // work started → fee is current cost
    expect(actualLabourCost([fixed], tasks).unpricedHours).toBe(0); // covered by the fee
    expect(actualLabourCost([fixed], []).cost).toBe(0); // nothing started yet
    expect(actualLabourCost([{ ...fixed, status: "completed" }], []).cost).toBe(12000);
  });

  it("a percent-paid member costs a share of the CURRENT revenue", () => {
    expect(forecastLabourCost([percent], [], 300000)).toBe(30000);
    expect(forecastLabourCost([percent], [], 345000)).toBe(34500);
    const f = computeFinancials({ project, members: [percent], tasks: [], costs: [], changeRequests: [{ status: "approved", additionalRevenue: 45000, additionalDirectCost: 0 }] });
    expect(f.forecast.labourCost).toBe(34500);
    expect(f.current.actualLabourCost).toBe(0);
  });

  it("mixes pay models in one team", () => {
    const tasks = [{ assigneeMemberId: "m1", estimatedHours: 10, actualHours: 10 }, { assigneeMemberId: "f1", estimatedHours: 5, actualHours: 5 }];
    const f = computeFinancials({ project, members: [members[0], fixed, percent], tasks, costs: [], changeRequests: [] });
    expect(f.current.actualLabourCost).toBe(10 * 1000 + 12000);
    expect(f.forecast.labourCost).toBe(40 * 1000 + 12000 + 30000);
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
