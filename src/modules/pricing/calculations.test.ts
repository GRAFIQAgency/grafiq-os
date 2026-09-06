import { describe, expect, it } from "vitest";

import {
  costItemTotal,
  grossMargin,
  grossProfit,
  healthStatus,
  recommendedSellingPrice,
  summarizeEstimate,
  totalDirectCosts,
} from "./calculations";
import { HEALTH_THRESHOLDS } from "./constants";
import type { CostItemInput, EstimateInput } from "./types";

const hourly = (hours: number, hourlyRate: number): CostItemInput => ({
  name: "Designer",
  kind: "hourly",
  hours,
  hourlyRate,
  fixedAmount: 0,
});

const fixed = (fixedAmount: number): CostItemInput => ({
  name: "Sales commission",
  kind: "fixed",
  hours: 0,
  hourlyRate: 0,
  fixedAmount,
});

describe("costItemTotal", () => {
  it("multiplies hours by rate for hourly items", () => {
    expect(costItemTotal(hourly(10, 1500))).toBe(15000);
  });

  it("uses the fixed amount for fixed items and ignores hours", () => {
    expect(costItemTotal({ ...fixed(5000), hours: 99, hourlyRate: 99 })).toBe(5000);
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
    const { HEALTHY_MIN, WARNING_MIN } = HEALTH_THRESHOLDS;
    expect(healthStatus(HEALTHY_MIN)).toBe("healthy");
    expect(healthStatus(HEALTHY_MIN + 20)).toBe("healthy");
    expect(healthStatus(HEALTHY_MIN - 0.01)).toBe("warning");
    expect(healthStatus(WARNING_MIN)).toBe("warning");
    expect(healthStatus(WARNING_MIN - 0.01)).toBe("bad");
    expect(healthStatus(-30)).toBe("bad");
  });

  it("is bad when margin is undefined (zero revenue)", () => {
    expect(healthStatus(null)).toBe("bad");
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
  };

  it("produces a consistent summary", () => {
    const s = summarizeEstimate(estimate);
    expect(s.revenue).toBe(300000);
    expect(s.directCosts).toBe(120000);
    expect(s.grossProfit).toBe(180000);
    expect(s.grossMargin).toBeCloseTo(60);
    expect(s.recommendedPrice).toBeCloseTo(300000);
    expect(s.health).toBe("healthy");
  });

  it("handles zero revenue without throwing", () => {
    const s = summarizeEstimate({ ...estimate, revenue: 0 });
    expect(s.grossProfit).toBe(-120000);
    expect(s.grossMargin).toBeNull();
    expect(s.health).toBe("bad");
    expect(s.recommendedPrice).toBeCloseTo(300000);
  });
});
