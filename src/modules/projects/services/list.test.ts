import { describe, expect, it } from "vitest";

import { computeFinancials } from "../calculations/financials";
import type { ProjectListItem } from "../types";
import { matchesProjectFilters, sortProjects } from "./list";

function item(over: Partial<ProjectListItem["project"]> & { margin?: number; health?: ProjectListItem["health"]["status"] } = {}): ProjectListItem {
  const { margin, health, ...p } = over;
  const revenue = p.baselineRevenue ?? 100000;
  const project: ProjectListItem["project"] = {
    id: "x", createdAt: "2026-09-01", updatedAt: "", name: "Web", clientId: "c1", clientName: "ACME", contactName: null, contactEmail: null, contactPhone: null,
    projectType: "website", status: "active", priority: "normal", ownerId: "u1", ownerName: "Alex", startDate: null, deadline: "2026-10-01", currency: "CZK",
    baselineRevenue: revenue, baselineDirectCost: revenue * (1 - (margin ?? 60) / 100), baselineTargetMargin: 60, baselineCreatedAt: "", pricingEstimateId: null,
    manualProgress: null, notes: null, completedAt: null, ...p,
  };
  const financials = computeFinancials({ project, members: [], tasks: [], costs: [], changeRequests: [] });
  return { project, financials, progress: { percent: 0, basis: "none", done: 0, total: 0 }, health: { status: health ?? "healthy", reasons: [] }, memberCount: 0, openTasks: 0 };
}

describe("project list filters", () => {
  it("hides archived projects unless asked", () => {
    const archived = item({ status: "archived" });
    expect(matchesProjectFilters(archived, {})).toBe(false);
    expect(matchesProjectFilters(archived, { includeArchived: true })).toBe(true);
    expect(matchesProjectFilters(archived, { status: "archived" })).toBe(true);
  });
  it("matches search, client, owner, type, priority, health and deadline", () => {
    const i = item({ priority: "high", health: "at_risk" });
    expect(matchesProjectFilters(i, { q: "acme web" })).toBe(true);
    expect(matchesProjectFilters(i, { clientId: "c2" })).toBe(false);
    expect(matchesProjectFilters(i, { ownerId: "u1", projectType: "website", priority: "high", health: "at_risk" })).toBe(true);
    expect(matchesProjectFilters(i, { deadlineBefore: "2026-09-30" })).toBe(false);
    expect(matchesProjectFilters(i, { deadlineBefore: "2026-10-01" })).toBe(true);
  });
});

describe("project list sorting", () => {
  const a = item({ id: "a", name: "Zeta", deadline: "2026-12-01", priority: "low", margin: 30, createdAt: "2026-01-01" });
  const b = item({ id: "b", name: "Alpha", deadline: "2026-09-15", priority: "critical", margin: 70, createdAt: "2026-05-01" });
  const c = item({ id: "c", name: "Closed", deadline: "2026-01-01", status: "completed", createdAt: "2026-03-01" });
  it("sorts by deadline with closed projects last, and by priority, margin, name, newest", () => {
    expect(sortProjects([a, b, c], "deadline").map((i) => i.project.id)).toEqual(["b", "a", "c"]);
    expect(sortProjects([a, b, c], "priority").map((i) => i.project.id)).toEqual(["b", "c", "a"]);
    expect(sortProjects([a, b], "margin").map((i) => i.project.id)).toEqual(["a", "b"]);
    expect(sortProjects([a, b, c], "name").map((i) => i.project.id)).toEqual(["b", "c", "a"]);
    expect(sortProjects([a, b, c], "newest").map((i) => i.project.id)).toEqual(["b", "c", "a"]);
  });
});
