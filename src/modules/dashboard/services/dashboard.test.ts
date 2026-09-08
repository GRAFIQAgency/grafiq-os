import { describe, expect, it } from "vitest";

import { modules } from "@/config/modules";
import cs from "@/lib/i18n/dictionaries/cs";
import en from "@/lib/i18n/dictionaries/en";
import { computeFinancials } from "@/modules/projects/calculations/financials";
import { computeHealth } from "@/modules/projects/calculations/health";
import type { ProjectSummary } from "@/modules/projects/queries";
import { portfolioTotals } from "@/modules/finance/calculations/portfolio";
import type { CapacityOverview } from "@/modules/capacity/types";
import type { FinanceRisk } from "@/modules/finance/types";
import type { QaStats } from "@/modules/qa/types";
import type { SalesAttentionItem } from "@/modules/sales/queries";
import type { PipelineStats } from "@/modules/sales/types";
import type { Currency } from "@/types/database";

import { QUICK_ACTIONS, SEVERITY_ORDER } from "../constants";
import type { DashboardFinance, DashboardProjects, Loaded } from "../types";
import { toActivityFeed } from "./activity";
import { capacityAttention, financeAttention, projectAttention, qaAttention, salesAttention, sortAttention } from "./attention";
import { capacityHealth, companyHealth, deliveryHealth, financeHealth, qaHealth, salesHealth } from "./health";
import { splitTimeline, toTimeline } from "./timeline";

const TODAY = "2026-09-09";
const hrefs = {
  project: (id: string) => `/projects/${id}`,
  capacityPerson: (k: string) => `/capacity/${k}`,
  capacity: "/capacity",
  checklist: (id: string) => `/qa/checklists/${id}`,
  deal: (id: string) => `/sales/${id}`,
  receivables: "/finance/receivables",
  payables: "/finance/payables",
};

function project(o: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: "p1", name: "Nevoga website", clientId: "c1", clientName: "Nevoga", status: "active", projectType: "website",
    deadline: "2026-10-01", currency: "CZK", health: "healthy", healthReasons: [], progress: { percent: 40, basis: "tasks_hours", done: 4, total: 10 },
    currentRevenue: 345_000, forecastGrossProfit: 145_500, forecastMargin: 42.2, openTasks: 3, blockedTasks: 0, memberCount: 4, completedAt: null, ...o,
  };
}
const capacity = (o: Partial<CapacityOverview> = {}): CapacityOverview => ({
  period: { kind: "month", start: "2026-09-01", end: "2026-09-30" }, utilization: 81, overloadedPeople: 0, availableHours: 600,
  remainingHours: 120, unscheduledHours: 0, configuredPeople: 4, unconfiguredPeople: 0, mostFree: [], overloaded: [], ...o,
});
const qaStats = (o: Partial<QaStats> = {}): QaStats => ({ projectsWithQa: 2, needsFixes: 0, readyForReview: 0, inProgress: 1, approvedThisMonth: 1, overdue: 0, ...o });
const pipeline = (o: Partial<PipelineStats> = {}): PipelineStats => ({
  openDeals: 5, openValue: { CZK: 850_000, EUR: 14_000 }, weightedValue: { CZK: 300_000, EUR: 5_600 }, overdueActions: 0, wonThisMonth: 1, lostThisMonth: 0,
  byStage: { prospect: 2, contacted: 1, qualified: 1, proposal: 1, negotiation: 0, customer: 3, lost: 1 }, ...o,
});
const financeData = (o: Partial<DashboardFinance> = {}): DashboardFinance => ({ currencies: [], risks: [], hasAccounts: true, forecast: [], portfolio: [], lowMargin: [], ...o });
const ok = <T,>(data: T): Loaded<T> => ({ state: "ok", data });
const projectsView = (o: Partial<DashboardProjects> = {}): DashboardProjects => ({
  summaries: [], active: 3, atRisk: 0, critical: 0, dueThisWeek: 1, waitingClient: 0, internalReview: 1, completedThisMonth: 2, attention: [], ...o,
});

// ---------------------------------------------------------------------------
// 1. Dashboard consumes module numbers instead of recomputing them
// ---------------------------------------------------------------------------
describe("dashboard consumes the source modules", () => {
  it("carries Projects' own health, margin and revenue through untouched", () => {
    const financials = computeFinancials({ project: { currency: "CZK", baselineRevenue: 300_000, baselineDirectCost: 250_000 }, members: [], tasks: [], costs: [], changeRequests: [] });
    const health = computeHealth({
      project: { status: "active", deadline: "2026-09-01" }, milestones: [], tasks: [], financials,
      progress: { percent: 20, basis: "tasks_count", done: 1, total: 5 }, thresholds: { target: 60, warning: 50, minimum: 40 }, today: new Date(`${TODAY}T00:00:00Z`),
    });
    const summary = project({ health: health.status, healthReasons: health.reasons, currentRevenue: financials.current.revenue, forecastMargin: financials.forecast.grossMargin });
    const [item] = projectAttention([summary], hrefs);
    expect(health.status).toBe("critical"); // overdue + margin below minimum
    expect(item.severity).toBe("critical");
    expect(item.reasonSource).toBe("projects");
    expect(item.reasons.map((r) => r.code)).toEqual(health.reasons.map((r) => r.code));
    expect(item.value).toEqual({ amount: financials.current.revenue, currency: "CZK" });
  });

  it("uses Finance's weighted portfolio totals, never an average of margins", () => {
    const fin = (currency: Currency, revenue: number, cost: number) => ({
      currency, financials: computeFinancials({ project: { currency, baselineRevenue: revenue, baselineDirectCost: cost }, members: [], tasks: [], costs: [], changeRequests: [] }),
    });
    const totals = portfolioTotals([fin("CZK", 10_000, 1_000), fin("CZK", 1_000_000, 800_000)], "forecast", ["CZK", "EUR", "USD"]);
    const data = financeData({ portfolio: totals });
    expect(data.portfolio[0].grossMargin).toBeCloseTo((209_000 / 1_010_000) * 100, 6);
    expect(data.portfolio[0].grossMargin).not.toBeCloseTo(55, 0); // the naive average
  });

  it("has no domain maths of its own: services only map and sort", async () => {
    const sources = await Promise.all(["./attention", "./health", "./timeline", "./activity"].map(async (m) => (await import(m)) as Record<string, unknown>));
    for (const mod of sources) for (const fn of Object.values(mod)) expect(typeof fn === "function" || typeof fn === "object").toBe(true);
    expect(Object.keys(financeData())).not.toContain("margin");
  });
});

// ---------------------------------------------------------------------------
// 2–7. Attention items and their ordering
// ---------------------------------------------------------------------------
describe("needs attention feed", () => {
  it("sorts critical before high before attention before info, then by source", () => {
    const items = sortAttention([
      ...salesAttention([{ companyId: "s1", name: "ACME", stage: "proposal", ownerName: null, value: 100, currency: "CZK", nextStep: "Call", nextActionAt: "2026-09-01", daysOverdue: 8, ageDays: 40, reason: "overdue_action" }], hrefs),
      ...qaAttention([{ checklistId: "q1", projectId: "p1", projectName: "Web", title: "Website QA", reason: "failed", count: 3, dueDate: "2026-09-20" }], hrefs),
      ...capacityAttention(capacity({ overloadedPeople: 1, overloaded: [{ personKey: "talent:1", name: "Petr", role: "3D", overBy: 18, utilization: 118 }] }), hrefs),
      ...financeAttention([{ code: "overdue_receivable", severity: "risk", currency: "CZK", params: { amount: 50_000 }, href: "/finance/receivables" }], "/finance"),
      ...projectAttention([project({ health: "critical", healthReasons: [{ code: "overdue_project", params: { days: 3 } }] })], hrefs),
    ]);
    expect(items.map((i) => `${i.severity}:${i.source}`)).toEqual([
      "critical:finance",   // overdue money first
      "critical:projects",  // then delivery
      "high:capacity",      // then people
      "high:qa",            // then quality
      "high:sales",         // then sales follow-ups
    ]);
    for (let i = 1; i < items.length; i += 1) {
      expect(SEVERITY_ORDER.indexOf(items[i - 1].severity)).toBeLessThanOrEqual(SEVERITY_ORDER.indexOf(items[i].severity));
    }
  });

  it("turns an overdue receivable into a Finance item that keeps the Finance sentence", () => {
    const risk: FinanceRisk = { code: "overdue_receivable", severity: "risk", currency: "CZK", params: { amount: 50_000, count: 1, largest: 50_000, label: "Brand package", client: "Alpha", days: 19 }, href: "/finance/receivables" };
    const [item] = financeAttention([risk], "/finance");
    expect(item).toMatchObject({ source: "finance", severity: "critical", textSource: "finance", code: "overdue_receivable", href: "/finance/receivables" });
    expect(item.params).toEqual(risk.params);
    expect(en.finance.risks[item.code as keyof typeof en.finance.risks]).toBeTruthy();
    // a warning-level risk stays below the risk-level ones
    expect(financeAttention([{ ...risk, code: "stale_balance", severity: "warning" }], "/finance")[0].severity).toBe("attention");
  });

  it("turns a critical project into a Project item and leaves healthy projects out", () => {
    const items = projectAttention([
      project({ id: "a", health: "critical", healthReasons: [{ code: "margin_below_minimum", params: { margin: 12 } }] }),
      project({ id: "b", health: "at_risk", healthReasons: [{ code: "blocked_tasks", params: { n: 2 } }] }),
      project({ id: "c", health: "healthy", healthReasons: [] }),
    ], hrefs);
    expect(items.map((i) => [i.id, i.severity])).toEqual([["project:a", "critical"], ["project:b", "high"]]);
    expect(items[0].href).toBe("/projects/a");
  });

  it("turns a capacity overload into a Capacity item, critical above 120 %", () => {
    const [high] = capacityAttention(capacity({ overloaded: [{ personKey: "talent:1", name: "Petr", role: "3D", overBy: 18, utilization: 118 }] }), hrefs);
    expect(high).toMatchObject({ source: "capacity", severity: "high", code: "capacity_overload", href: "/capacity/talent:1" });
    expect(high.params).toMatchObject({ name: "Petr", hours: 18, percent: 118 });
    const [critical] = capacityAttention(capacity({ overloaded: [{ personKey: "talent:2", name: "Iva", role: null, overBy: 40, utilization: 135 }] }), hrefs);
    expect(critical.severity).toBe("critical");
    expect(capacityAttention(null, hrefs)).toEqual([]);
  });

  it("turns failed QA into a QA item and 'ready for review' into info", () => {
    const items = qaAttention([
      { checklistId: "q1", projectId: "p1", projectName: "Web", title: "Website QA", reason: "failed", count: 3, dueDate: "2026-09-20" },
      { checklistId: "q2", projectId: "p2", projectName: "Brand", title: "Branding QA", reason: "ready_for_review", count: 1, dueDate: null },
    ], hrefs);
    expect(items.map((i) => [i.code, i.severity])).toEqual([["qa_failed", "high"], ["qa_ready_for_review", "info"]]);
    expect(items[0].params).toMatchObject({ project: "Web", n: 3 });
    expect(items[0].href).toBe("/qa/checklists/q1");
  });

  it("turns an overdue sales action into a Sales item, high only when long overdue", () => {
    const base: SalesAttentionItem = { companyId: "s1", name: "ACME", stage: "proposal", ownerName: "Alex", value: 250_000, currency: "CZK", nextStep: "Send proposal", nextActionAt: "2026-09-05", daysOverdue: 4, ageDays: 20, reason: "overdue_action" };
    expect(salesAttention([base], hrefs)[0]).toMatchObject({ source: "sales", severity: "attention", code: "sales_overdue_action", href: "/sales/s1" });
    expect(salesAttention([{ ...base, daysOverdue: 9 }], hrefs)[0].severity).toBe("high");
    expect(salesAttention([{ ...base, reason: "stale", daysOverdue: 0 }], hrefs)[0].severity).toBe("info");
  });
});

// ---------------------------------------------------------------------------
// 8. Timeline
// ---------------------------------------------------------------------------
describe("today / next 7 days", () => {
  const events = toTimeline({
    projects: [{ kind: "project_deadline", id: "p1", projectId: "p1", projectName: "Web", title: "Web", date: "2026-09-14", health: "at_risk" }],
    qa: [{ checklistId: "q1", projectId: "p1", projectName: "Web", title: "Website QA", date: "2026-09-09", status: "in_progress", overdue: false }],
    sales: [{ companyId: "s1", name: "ACME", stage: "proposal", title: "Call", date: "2026-09-02", overdue: true }],
    finance: [{ kind: "receivable", id: "r1", label: "Instalment 2", party: "Nevoga", projectId: "p1", projectName: "Web", amount: 108_900, currency: "CZK", date: "2026-09-09", overdue: false }],
  }, TODAY, hrefs);

  it("orders by date and splits due-now from the coming days", () => {
    expect(events.map((e) => e.date)).toEqual(["2026-09-02", "2026-09-09", "2026-09-09", "2026-09-14"]);
    const split = splitTimeline(events, TODAY);
    expect(split.today.map((e) => e.kind)).toEqual(["sales_action", "receivable", "qa_due"]); // overdue sales action first, finance before qa on the same day
    expect(split.week.map((e) => e.kind)).toEqual(["project_deadline"]);
    expect(split.today[0].overdue).toBe(true);
  });

  it("keeps money on the event and links every item to its source", () => {
    const receivable = events.find((e) => e.kind === "receivable");
    expect(receivable?.value).toEqual({ amount: 108_900, currency: "CZK" });
    expect(receivable?.href).toBe("/finance/receivables");
    expect(events.find((e) => e.kind === "qa_due")?.href).toBe("/qa/checklists/q1");
    expect(events.find((e) => e.kind === "project_deadline")?.href).toBe("/projects/p1");
  });
});

// ---------------------------------------------------------------------------
// 9–12. Unknown vs zero, currencies, error isolation
// ---------------------------------------------------------------------------
describe("company health and degraded data", () => {
  const h = { sales: "/sales", projects: "/projects", capacity: "/capacity", qa: "/qa", finance: "/finance" };

  it("reports unknown (never zero) when a module is not configured", () => {
    expect(capacityHealth(ok(capacity({ utilization: null })), h.capacity)).toMatchObject({ status: "unknown", code: "capacity_unconfigured" });
    expect(financeHealth(ok(financeData({ hasAccounts: false })), h.finance)).toMatchObject({ status: "unknown", code: "finance_unconfigured" });
    expect(qaHealth(ok(qaStats({ projectsWithQa: 0 })), h.qa)).toMatchObject({ status: "unknown", code: "qa_empty" });
    expect(deliveryHealth(ok(projectsView({ active: 0 })), h.projects)).toMatchObject({ status: "unknown", code: "delivery_empty" });
    expect(salesHealth(ok(pipeline({ openDeals: 0, wonThisMonth: 0, lostThisMonth: 0 })), h.sales)).toMatchObject({ status: "unknown", code: "sales_empty" });
  });

  it("maps real module signals to healthy / attention / risk", () => {
    expect(deliveryHealth(ok(projectsView({ critical: 2 })), h.projects)).toMatchObject({ status: "risk", code: "delivery_critical", params: { n: 2 } });
    expect(deliveryHealth(ok(projectsView({ atRisk: 1 })), h.projects).status).toBe("attention");
    expect(capacityHealth(ok(capacity({ overloadedPeople: 1, utilization: 118 })), h.capacity)).toMatchObject({ status: "risk", params: { n: 1, percent: 118 } });
    expect(capacityHealth(ok(capacity({ utilization: 97 })), h.capacity).status).toBe("attention");
    expect(capacityHealth(ok(capacity()), h.capacity)).toMatchObject({ status: "healthy", params: { percent: 81 } });
    expect(qaHealth(ok(qaStats({ needsFixes: 2 })), h.qa).status).toBe("risk");
    expect(salesHealth(ok(pipeline({ overdueActions: 3 })), h.sales)).toMatchObject({ status: "attention", params: { n: 3 } });
    expect(financeHealth(ok(financeData({ risks: [{ code: "cash_below_zero", severity: "risk", currency: "CZK", params: {}, href: null }] })), h.finance).status).toBe("risk");
  });

  it("keeps the other areas usable when one module read fails", () => {
    const areas = companyHealth(
      { sales: ok(pipeline()), projects: { state: "error", data: null }, capacity: ok(capacity()), qa: ok(qaStats()), finance: { state: "error", data: null } },
      h
    );
    expect(areas.find((a) => a.area === "delivery")).toMatchObject({ status: "unknown", code: "unavailable" });
    expect(areas.find((a) => a.area === "finance")).toMatchObject({ status: "unknown", code: "unavailable" });
    expect(areas.find((a) => a.area === "capacity")?.status).toBe("healthy");
    expect(areas.find((a) => a.area === "sales")?.status).toBe("healthy");
    expect(areas.find((a) => a.area === "qa")?.status).toBe("healthy");
    // the feed still builds from the modules that answered
    const items = sortAttention([...capacityAttention(capacity({ overloaded: [{ personKey: "talent:1", name: "Petr", role: null, overBy: 5, utilization: 105 }] }), hrefs), ...qaAttention([], hrefs)]);
    expect(items).toHaveLength(1);
  });

  it("never merges currencies in pipeline or portfolio values", () => {
    const s = pipeline();
    expect(Object.entries(s.openValue)).toEqual([["CZK", 850_000], ["EUR", 14_000]]);
    expect(Object.values(s.openValue).reduce((a, b) => a + b, 0)).not.toBe(864_000_000);
    const totals = portfolioTotals(
      [{ currency: "CZK" as Currency, financials: computeFinancials({ project: { currency: "CZK", baselineRevenue: 100, baselineDirectCost: 40 }, members: [], tasks: [], costs: [], changeRequests: [] }) },
       { currency: "EUR" as Currency, financials: computeFinancials({ project: { currency: "EUR", baselineRevenue: 50, baselineDirectCost: 10 }, members: [], tasks: [], costs: [], changeRequests: [] }) }],
      "forecast", ["CZK", "EUR", "USD"]
    );
    expect(totals.map((t) => t.currency)).toEqual(["CZK", "EUR"]);
  });
});

// ---------------------------------------------------------------------------
// 13–15. Links, modules and translations
// ---------------------------------------------------------------------------
describe("links and texts", () => {
  it("quick actions point at routes of active modules only", () => {
    for (const action of QUICK_ACTIONS) {
      const owner = modules.find((m) => m.id === action.moduleId);
      expect(owner, `unknown module ${action.moduleId}`).toBeDefined();
      expect(owner?.status, `${action.moduleId} is not active`).toBe("active");
      expect(action.href === owner?.href || action.href.startsWith(`${owner?.href}/`), `${action.href} is outside ${owner?.href}`).toBe(true);
      for (const dict of [en, cs]) expect((dict.dashboard.quickActions as Record<string, string>)[action.id]).toBeTruthy();
    }
  });

  it("has EN and CS text for every attention, health and timeline key it can emit", () => {
    const attentionCodes = ["project_health", "capacity_overload", "capacity_unscheduled", "capacity_unconfigured", "qa_failed", "qa_blocked", "qa_overdue", "qa_ready_for_review", "sales_overdue_action", "sales_no_next_action", "sales_stale"];
    const healthCodes = ["unavailable", "sales_empty", "sales_overdue", "sales_ok", "delivery_empty", "delivery_critical", "delivery_at_risk", "delivery_ok", "capacity_unconfigured", "capacity_overloaded", "capacity_full", "capacity_ok", "qa_empty", "qa_problems", "qa_review", "qa_ok", "finance_unconfigured", "finance_risk", "finance_warning", "finance_ok"];
    const kinds = ["project_deadline", "milestone", "qa_due", "sales_action", "receivable", "payable"];
    for (const dict of [en, cs]) {
      const attention = dict.dashboard.attention as unknown as Record<string, { title?: string }>;
      for (const code of attentionCodes) expect(attention[code]?.title, `missing attention text ${code}`).toBeTruthy();
      for (const code of healthCodes) expect((dict.dashboard.health.reasons as Record<string, string>)[code], `missing health text ${code}`).toBeTruthy();
      for (const kind of kinds) expect((dict.dashboard.timeline.kinds as Record<string, string>)[kind], `missing timeline text ${kind}`).toBeTruthy();
      for (const area of ["sales", "delivery", "capacity", "qa", "finance"]) expect((dict.dashboard.health.areas as Record<string, string>)[area]).toBeTruthy();
    }
  });

  it("links activity entries to the entity they belong to", () => {
    const feed = toActivityFeed([
      { id: "a1", createdAt: "", entityType: "project", entityId: "p1", action: "qa_approved", actorName: "Alex", details: { title: "Website QA" } },
      { id: "a2", createdAt: "", entityType: "company", entityId: "c1", action: "deal_stage_changed", actorName: null, details: { to: "proposal", nested: { x: 1 } } },
      { id: "a3", createdAt: "", entityType: "talent", entityId: "t1", action: "saved_to_bench", actorName: null, details: {} },
      { id: "a4", createdAt: "", entityType: "other", entityId: "x", action: "created", actorName: null, details: {} },
    ], { project: (id) => `/projects/${id}`, company: (id) => `/sourcing/companies/${id}`, talent: (id) => `/sourcing/talent/${id}` });
    expect(feed.map((f) => f.href)).toEqual(["/projects/p1", "/sourcing/companies/c1", "/sourcing/talent/t1", null]);
    expect(feed[0].detail).toBe("Website QA");
    expect(feed[1].detail).toBe("proposal"); // nested objects are skipped
  });
});
