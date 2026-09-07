import { describe, expect, it } from "vitest";

import type { HealthInput, ProjectFinancials } from "../types";
import { computeFinancials } from "./financials";
import { computeHealth } from "./health";
import { computeProgress } from "./progress";

const thresholds = { target: 60, warning: 50, minimum: 40 };
const today = new Date("2026-09-07T12:00:00Z");

function fin(over: Partial<{ revenue: number; directCost: number; forecastCost: number; activity: boolean }> = {}): ProjectFinancials {
  const revenue = over.revenue ?? 300000;
  const directCost = over.directCost ?? 120000;
  const forecastCost = over.forecastCost ?? directCost;
  const f = computeFinancials({ project: { currency: "CZK", baselineRevenue: revenue, baselineDirectCost: directCost }, members: [], tasks: [], costs: [], changeRequests: [] });
  return {
    ...f,
    forecast: { ...f.forecast, directCost: forecastCost, grossProfit: revenue - forecastCost, grossMargin: revenue ? ((revenue - forecastCost) / revenue) * 100 : null, basis: over.activity ? "activity" : "baseline" },
  };
}

function input(over: Partial<HealthInput> = {}): HealthInput {
  return {
    project: { status: "active", deadline: "2026-10-01" },
    milestones: [],
    tasks: [],
    financials: fin(),
    progress: computeProgress([], [], null),
    thresholds,
    today,
    ...over,
  };
}

describe("computeHealth", () => {
  it("is healthy with no issues", () => {
    expect(computeHealth(input())).toEqual({ status: "healthy", reasons: [] });
  });

  it("flags an overdue project (at risk, critical after a week)", () => {
    expect(computeHealth(input({ project: { status: "active", deadline: "2026-09-04" } })).status).toBe("at_risk");
    const r = computeHealth(input({ project: { status: "active", deadline: "2026-08-20" } }));
    expect(r.status).toBe("critical");
    expect(r.reasons[0]).toEqual({ code: "overdue_project", params: { days: 18 } });
  });

  it("ignores deadlines for closed projects", () => {
    expect(computeHealth(input({ project: { status: "completed", deadline: "2026-01-01" } })).status).toBe("healthy");
  });

  it("flags overdue milestones and blocked tasks", () => {
    const r = computeHealth(input({
      milestones: [{ title: "Development", dueDate: "2026-09-03", status: "in_progress" }, { title: "Done one", dueDate: "2026-09-01", status: "completed" }],
      tasks: [{ status: "blocked" }, { status: "blocked" }, { status: "done" }],
    }));
    expect(r.status).toBe("at_risk");
    expect(r.reasons).toContainEqual({ code: "overdue_milestone", params: { title: "Development", days: 4 } });
    expect(r.reasons).toContainEqual({ code: "blocked_tasks", params: { n: 2 } });
    expect(computeHealth(input({ tasks: [{ status: "blocked" }] })).status).toBe("attention");
  });

  it("uses the Settings margin thresholds on the forecast margin", () => {
    expect(computeHealth(input({ financials: fin({ forecastCost: 130000 }) })).status).toBe("attention"); // 56.7 % < target 60
    expect(computeHealth(input({ financials: fin({ forecastCost: 160000 }) })).status).toBe("at_risk");   // 46.7 % < warning 50
    const r = computeHealth(input({ financials: fin({ forecastCost: 200000 }) }));                          // 33.3 % < minimum 40
    expect(r.status).toBe("critical");
    expect(r.reasons[0].code).toBe("margin_below_minimum");
  });

  it("flags cost overruns only when the forecast comes from real activity", () => {
    expect(computeHealth(input({ financials: fin({ forecastCost: 135000, activity: true, revenue: 1000000 }) })).reasons.map((x) => x.code)).toContain("cost_overrun");
    expect(computeHealth(input({ financials: fin({ forecastCost: 135000, activity: false, revenue: 1000000 }) })).reasons.map((x) => x.code)).not.toContain("cost_overrun");
    expect(computeHealth(input({ financials: fin({ forecastCost: 160000, activity: true, revenue: 1000000 }) })).status).toBe("critical"); // +33 %
  });

  it("warns when the deadline is close and work is unfinished", () => {
    const r = computeHealth(input({ project: { status: "active", deadline: "2026-09-10" }, progress: computeProgress([{ status: "done", estimatedHours: 2 }, { status: "todo", estimatedHours: 8 }], [], null) }));
    expect(r.status).toBe("attention");
    expect(r.reasons[0]).toEqual({ code: "deadline_soon", params: { days: 3, percent: 80 } });
  });
});

describe("computeProgress", () => {
  it("prefers task hours, then task count, then milestones, then manual", () => {
    expect(computeProgress([{ status: "done", estimatedHours: 30 }, { status: "todo", estimatedHours: 10 }], [], 10)).toMatchObject({ percent: 75, basis: "tasks_hours" });
    expect(computeProgress([{ status: "done", estimatedHours: null }, { status: "todo", estimatedHours: null }], [], 10)).toMatchObject({ percent: 50, basis: "tasks_count" });
    expect(computeProgress([], [{ status: "completed" }, { status: "completed" }, { status: "blocked" }], 10)).toMatchObject({ percent: 67, basis: "milestones" });
    expect(computeProgress([], [], 35)).toMatchObject({ percent: 35, basis: "manual" });
    expect(computeProgress([], [], null)).toMatchObject({ percent: 0, basis: "none" });
  });
});
