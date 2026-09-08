import { describe, expect, it } from "vitest";

import type { MarginThresholds } from "@/modules/settings/types";

import {
  costItemTotal,
  fixedDirectCosts,
  grossMargin,
  percentShare,
  grossProfit,
  healthStatus,
  recommendedSellingPrice,
  requiresFounderApproval,
  summarizeEstimate,
  totalDirectCosts,
} from "./calculations";
import type { CostItemInput, EstimateInput } from "./types";

/** Thresholds as configured in Business Settings. */
const thresholds: MarginThresholds = { target: 60, warning: 50, minimum: 40 };

const unitFields = { quantity: 0, unitCost: 0, unitLabel: null as string | null };
const hourly = (hours: number, hourlyRate: number): CostItemInput => ({
  name: "Designer",
  kind: "hourly",
  hours,
  hourlyRate,
  fixedAmount: 0,
  percent: 0,
  ...unitFields,
});

const unit = (quantity: number, unitCost: number): CostItemInput => ({
  name: "3D artist",
  kind: "unit",
  hours: 0,
  hourlyRate: 0,
  fixedAmount: 0,
  percent: 0,
  quantity,
  unitCost,
  unitLabel: "model",
});

const fixed = (fixedAmount: number): CostItemInput => ({
  name: "3D Designer",
  kind: "fixed",
  hours: 0,
  hourlyRate: 0,
  fixedAmount,
  percent: 0,
  ...unitFields,
});

const percent = (share: number): CostItemInput => ({
  name: "Sales commission",
  kind: "percent",
  hours: 0,
  hourlyRate: 0,
  fixedAmount: 0,
  percent: share,
  ...unitFields,
});

const TOTAL = { pricingBasis: "total" as const, unitCount: null, unitPrice: null, unitLabel: null };

describe("costItemTotal", () => {
  it("multiplies hours by rate for hourly items", () => {
    expect(costItemTotal(hourly(10, 1500))).toBe(15000);
  });

  it("uses the fixed amount for fixed items and ignores hours", () => {
    expect(costItemTotal({ ...fixed(5000), hours: 99, hourlyRate: 99 })).toBe(5000);
  });

  it("takes a share of the client price for percent items", () => {
    expect(costItemTotal(percent(10), 300000)).toBe(30000);
    expect(costItemTotal(percent(10))).toBe(0);
  });

  it("multiplies quantity by unit cost for unit items", () => {
    expect(costItemTotal(unit(300, 500))).toBe(150000);
  });
});

describe("per-unit pricing", () => {
  it("derives the client price from unit count × unit price and reports per-unit numbers", () => {
    const summary = summarizeEstimate({
      projectName: "300 product renders", clientName: "", currency: "CZK", revenue: 0, targetMargin: 40,
      items: [unit(300, 500), fixed(30000)],
      pricingBasis: "per_unit", unitCount: 300, unitPrice: 900, unitLabel: "model",
    }, thresholds);
    expect(summary.revenue).toBe(270000);
    expect(summary.directCosts).toBe(180000);
    expect(summary.perUnit).toEqual({ count: 300, price: 900, cost: 600, profit: 300, label: "model" });
    expect(summary.grossMargin).toBeCloseTo(33.33, 1);
  });

  it("ignores unit fields when priced as a total", () => {
    const summary = summarizeEstimate({ projectName: "x", clientName: "", currency: "CZK", revenue: 100000, targetMargin: 40, items: [], pricingBasis: "total", unitCount: 300, unitPrice: 900, unitLabel: null }, thresholds);
    expect(summary.revenue).toBe(100000);
    expect(summary.perUnit).toBeNull();
  });
});

describe("percent lines", () => {
  it("splits fixed costs from the percent share", () => {
    const items = [hourly(10, 1500), fixed(5000), percent(10), percent(5)];
    expect(fixedDirectCosts(items)).toBe(20000);
    expect(percentShare(items)).toBe(15);
    expect(totalDirectCosts(items, 200000)).toBe(50000);
  });

  it("recommended price accounts for percent-of-price costs", () => {
    // price × (1 − 0.6) = 120 000 + price × 0.1  →  price = 120 000 / 0.3 = 400 000
    expect(recommendedSellingPrice(120000, 60, 10)).toBeCloseTo(400000);
    expect(recommendedSellingPrice(120000, 60, 40)).toBeNull();
  });

  it("summarises an estimate with a 10 % sales commission", () => {
    const summary = summarizeEstimate({
      projectName: "Site", clientName: "", currency: "CZK", revenue: 400000, targetMargin: 60,
      items: [hourly(80, 1500), percent(10)], ...TOTAL,
    }, thresholds);
    expect(summary.directCosts).toBe(160000);
    expect(summary.grossMargin).toBeCloseTo(60);
    expect(summary.recommendedPrice).toBeCloseTo(400000);
    expect(summary.health).toBe("healthy");
  });
});

describe("totalDirectCosts", () => {
  it("sums all items", () => {
    expect(totalDirectCosts([hourly(10, 1500), fixed(5000)])).toBe(20000);
  });

  it("is zero for no items", () => {
    expect(totalDirectCosts([])).toBe(0);
  });
});

describe("grossProfit", () => {
  it("is revenue minus direct costs", () => {
    expect(grossProfit(300000, 120000)).toBe(180000);
  });

  it("is negative when costs exceed revenue", () => {
    expect(grossProfit(100000, 120000)).toBe(-20000);
  });
});

describe("grossMargin", () => {
  it("returns percent of revenue", () => {
    expect(grossMargin(300000, 120000)).toBeCloseTo(60);
  });

  it("is null when revenue is zero (undefined ratio, no division by zero)", () => {
    expect(grossMargin(0, 120000)).toBeNull();
    expect(grossMargin(0, 0)).toBeNull();
  });

  it("is 100 when there are no costs", () => {
    expect(grossMargin(50000, 0)).toBe(100);
  });

  it("goes negative when costs exceed revenue", () => {
    expect(grossMargin(100000, 150000)).toBeCloseTo(-50);
  });
});

describe("recommendedSellingPrice", () => {
  it("matches the spec example: 120 000 at 60 % → 300 000", () => {
    expect(recommendedSellingPrice(120000, 60)).toBeCloseTo(300000);
  });

  it("equals direct costs when target margin is 0 %", () => {
    expect(recommendedSellingPrice(120000, 0)).toBe(120000);
  });

  it("is zero when there are no costs", () => {
    expect(recommendedSellingPrice(0, 60)).toBe(0);
  });

  it("is null when target margin is 100 % or more", () => {
    expect(recommendedSellingPrice(120000, 100)).toBeNull();
    expect(recommendedSellingPrice(120000, 150)).toBeNull();
  });
});

describe("healthStatus", () => {
  it("follows the configured thresholds", () => {
    expect(healthStatus(60, thresholds)).toBe("healthy");
    expect(healthStatus(80, thresholds)).toBe("healthy");
    expect(healthStatus(59.99, thresholds)).toBe("warning");
    expect(healthStatus(50, thresholds)).toBe("warning");
    expect(healthStatus(49.99, thresholds)).toBe("bad");
    expect(healthStatus(-30, thresholds)).toBe("bad");
  });

  it("reacts to changed settings", () => {
    const relaxed: MarginThresholds = { target: 40, warning: 30, minimum: 20 };
    expect(healthStatus(45, relaxed)).toBe("healthy");
    expect(healthStatus(35, relaxed)).toBe("warning");
    expect(healthStatus(25, relaxed)).toBe("bad");
  });

  it("is bad when margin is undefined (zero revenue)", () => {
    expect(healthStatus(null, thresholds)).toBe("bad");
  });
});

describe("requiresFounderApproval", () => {
  it("is true only below the minimum margin", () => {
    expect(requiresFounderApproval(39.99, thresholds)).toBe(true);
    expect(requiresFounderApproval(40, thresholds)).toBe(false);
    expect(requiresFounderApproval(55, thresholds)).toBe(false);
    expect(requiresFounderApproval(null, thresholds)).toBe(false);
  });
});

describe("summarizeEstimate", () => {
  const estimate: EstimateInput = {
    projectName: "Brand refresh",
    clientName: "ACME",
    currency: "CZK",
    revenue: 300000,
    targetMargin: 60,
    items: [hourly(40, 1500), hourly(30, 2000), fixed(0)],
      ...TOTAL,
  };

  it("produces a consistent summary", () => {
    const s = summarizeEstimate(estimate, thresholds);
    expect(s.revenue).toBe(300000);
    expect(s.directCosts).toBe(120000);
    expect(s.grossProfit).toBe(180000);
    expect(s.grossMargin).toBeCloseTo(60);
    expect(s.recommendedPrice).toBeCloseTo(300000);
    expect(s.health).toBe("healthy");
    expect(s.requiresApproval).toBe(false);
  });

  it("handles zero revenue without throwing", () => {
    const s = summarizeEstimate({ ...estimate, revenue: 0 }, thresholds);
    expect(s.grossProfit).toBe(-120000);
    expect(s.grossMargin).toBeNull();
    expect(s.health).toBe("bad");
    expect(s.recommendedPrice).toBeCloseTo(300000);
  });
});
