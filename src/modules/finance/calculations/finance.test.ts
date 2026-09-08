import { describe, expect, it } from "vitest";

import { computeFinancials } from "@/modules/projects/calculations/financials";
import { splitByPaymentTerms } from "@/modules/settings/services";
import type { Currency } from "@/types/database";

import type { CashPosition, FinanceAccount, Payable, PayableView, Receivable, ReceivableView, RecurringCost } from "../types";
import { addMonths, daysBetween, monthKeys } from "./dates";
import { buildForecast, cashPosition, isStale, placementMonth } from "./forecast";
import { currencyOverview, matchesItemFilters, receivablesSummary } from "./overview";
import { suggestPayableAmount } from "./payee";
import { marginHealth, matchesProfitabilityFilters, portfolioTotals } from "./portfolio";
import { expandOccurrences, nextDueAfterPayment } from "./recurring";
import { financeRisks } from "./risk";
import { generateSchedule, grossAmount, reconcileContract, splitContract } from "./schedule";
import { groupByBucket, paymentAllowed, payableStatus, receivableStatus, toPayableView, toReceivableView } from "./status";

const TODAY = "2026-09-08";
const ORDER: readonly Currency[] = ["CZK", "EUR", "USD"];
const hrefs = { receivables: "/finance/receivables", payables: "/finance/payables", cashflow: "/finance/cashflow", project: (id: string) => `/finance/projects/${id}` };

const receivable = (o: Partial<Receivable> = {}): Receivable => ({
  id: "r1", createdAt: "", updatedAt: "", projectId: "p1", projectName: "Web", clientId: "c1", clientName: "Nevoga", label: "Payment 1",
  netAmount: 100_000, vatRate: 21, amount: 121_000, currency: "CZK", dueDate: "2026-09-20", expectedDate: null, percentOfContract: 50,
  invoiceReference: null, invoiceSentAt: null, notes: null, state: "open", cancelledAt: null, position: 0, ...o,
});
const payable = (o: Partial<Payable> = {}): Payable => ({
  id: "y1", createdAt: "", updatedAt: "", label: "3D freelancer", amount: 25_000, currency: "CZK", dueDate: "2026-09-15", projectId: "p1", projectName: "Web",
  talentCandidateId: null, supplierId: null, payeeName: "Petr", category: "freelancer", notes: null, state: "open", cancelledAt: null, ...o,
});
const account = (o: Partial<FinanceAccount> = {}): FinanceAccount => ({
  id: "a1", createdAt: "", updatedAt: "", name: "Main CZK", currency: "CZK", type: "bank", currentBalance: 420_000, balanceAsOf: "2026-09-01", isActive: true, notes: null, ...o,
});
const recurring = (o: Partial<RecurringCost> = {}): RecurringCost => ({
  id: "rc1", createdAt: "", updatedAt: "", name: "Adobe", category: "software", amount: 500, currency: "EUR", frequency: "monthly", nextDueDate: "2026-10-01", isActive: true, notes: null, ...o,
});
const ev = (amount: number, occurredAt: string, extra: Partial<{ direction: "in" | "out"; currency: Currency; accountId: string | null; voidedAt: string | null }> = {}) => ({
  direction: "in" as const, currency: "CZK" as Currency, accountId: "a1", voidedAt: null, amount, occurredAt, ...extra,
});
const position = (currency: Currency, available: number, extra: Partial<CashPosition> = {}): CashPosition => ({ currency, balance: available, adjustments: 0, available, accounts: [{ id: "a", name: "A", balance: available, asOf: TODAY, stale: false }], stale: false, unknown: false, ...extra });
const thresholds = { target: 60, warning: 50, minimum: 40 };

// ---------------------------------------------------------------------------
// 1–6. Project profitability comes from Projects; snapshots stay historical
// ---------------------------------------------------------------------------
describe("profitability reuses Projects logic and historical pay snapshots", () => {
  const project = { currency: "CZK" as Currency, baselineRevenue: 300_000, baselineDirectCost: 120_000 };
  const member = (o: Record<string, unknown>) => ({ id: "m1", status: "active" as const, plannedHours: 100, costRate: null, payModel: "hourly" as const, fixedCost: null, percent: null, unitCost: null, plannedUnits: null, deliveredUnits: 0, currency: "CZK" as Currency, ...o });
  const TALENT_RATE_TODAY = 800; // what Talent says now — must never be used

  it("hourly: uses the 700 CZK/h snapshot, not today's 800 CZK/h", () => {
    const m = member({ costRate: 700 });
    const tasks = [{ assigneeMemberId: "m1", estimatedHours: 100, actualHours: 40 }];
    const f = computeFinancials({ project, members: [m], tasks, costs: [], changeRequests: [] });
    expect(f.current.actualLabourCost).toBe(40 * 700);
    expect(f.forecast.labourCost).toBe(100 * 700);
    expect(suggestPayableAmount(m, tasks, f.current.revenue)).toMatchObject({ amount: 28_000, basis: "hours_actual", rate: 700 });
    expect(suggestPayableAmount(m, tasks, f.current.revenue).amount).not.toBe(40 * TALENT_RATE_TODAY);
  });

  it("fixed: the agreed project fee snapshot", () => {
    const m = member({ payModel: "fixed", fixedCost: 45_000 });
    const f = computeFinancials({ project, members: [m], tasks: [{ assigneeMemberId: "m1", estimatedHours: 10, actualHours: 5 }], costs: [], changeRequests: [] });
    expect(f.current.actualLabourCost).toBe(45_000);
    expect(suggestPayableAmount(m, [], f.current.revenue)).toMatchObject({ amount: 45_000, basis: "fixed" });
  });

  it("percent: share of CURRENT revenue with the snapshot percent", () => {
    const m = member({ payModel: "percent", percent: 10 });
    const f = computeFinancials({ project, members: [m], tasks: [], costs: [], changeRequests: [{ status: "approved", additionalRevenue: 45_000, additionalDirectCost: 0 }] });
    expect(f.current.revenue).toBe(345_000);
    expect(f.forecast.labourCost).toBe(34_500);
    expect(suggestPayableAmount(m, [], f.current.revenue)).toMatchObject({ amount: 34_500, basis: "percent", rate: 10 });
  });

  it("per unit: delivered units × snapshot unit cost", () => {
    const m = member({ payModel: "unit", unitCost: 120, plannedUnits: 300, deliveredUnits: 40 });
    const f = computeFinancials({ project, members: [m], tasks: [], costs: [], changeRequests: [] });
    expect(f.current.actualLabourCost).toBe(4_800);
    expect(f.forecast.labourCost).toBe(36_000);
    expect(suggestPayableAmount(m, [], f.current.revenue)).toMatchObject({ amount: 4_800, basis: "unit", units: 40, rate: 120 });
  });

  it("portfolio totals are taken from ProjectFinancials as given", () => {
    const f = computeFinancials({ project, members: [], tasks: [], costs: [], changeRequests: [] });
    const [czk] = portfolioTotals([{ currency: "CZK", financials: f }], "baseline", ORDER);
    expect(czk).toMatchObject({ revenue: 300_000, directCost: 120_000, grossProfit: 180_000, grossMargin: 60 });
  });
});

// ---------------------------------------------------------------------------
// 7–12. Receivables, payables, partial payments, currency integrity
// ---------------------------------------------------------------------------
describe("receivable and payable status", () => {
  it("partial payment leaves the right outstanding amount", () => {
    const v = toReceivableView(receivable({ amount: 150_000, netAmount: 150_000, vatRate: 0 }), [{ amount: 100_000, voidedAt: null }], TODAY);
    expect(v.received).toBe(100_000);
    expect(v.outstanding).toBe(50_000);
    expect(v.status).toBe("partially_paid");
  });

  it("full payment (in two steps) becomes Paid; voided events do not count", () => {
    const v = toReceivableView(receivable({ amount: 150_000 }), [{ amount: 100_000, voidedAt: null }, { amount: 50_000, voidedAt: null }, { amount: 9_999, voidedAt: "2026-09-01" }], TODAY);
    expect(v.status).toBe("paid");
    expect(v.outstanding).toBe(0);
    expect(v.bucket).toBe("paid");
  });

  it("past-due outstanding receivable is Overdue with days counted", () => {
    const v = toReceivableView(receivable({ dueDate: "2026-09-01" }), [], TODAY);
    expect(v.status).toBe("overdue");
    expect(v.daysOverdue).toBe(7);
    expect(v.bucket).toBe("overdue");
    expect(receivableStatus(receivable({ invoiceSentAt: "2026-09-02" }), 0, TODAY)).toBe("invoiced");
    expect(receivableStatus(receivable({ state: "cancelled" }), 0, TODAY)).toBe("cancelled");
  });

  it("partial and full payable payments", () => {
    const partial = toPayableView(payable(), [{ amount: 10_000, voidedAt: null }], TODAY);
    expect(partial).toMatchObject({ paid: 10_000, outstanding: 15_000, status: "partially_paid" });
    const full = toPayableView(payable(), [{ amount: 10_000, voidedAt: null }, { amount: 15_000, voidedAt: null }], TODAY);
    expect(full.status).toBe("paid");
    expect(payableStatus(payable({ dueDate: "2026-08-01" }), 0, TODAY)).toBe("overdue");
  });

  it("a payment can never silently exceed what is outstanding", () => {
    expect(paymentAllowed({ state: "open", amount: 100 }, 60, 40)).toEqual({ ok: true });
    expect(paymentAllowed({ state: "open", amount: 100 }, 60, 40.01)).toMatchObject({ ok: false, reason: "exceeds", outstanding: 40 });
    expect(paymentAllowed({ state: "cancelled", amount: 100 }, 0, 10)).toMatchObject({ ok: false, reason: "cancelled" });
    expect(paymentAllowed({ state: "open", amount: 100 }, 0, 0)).toMatchObject({ ok: false, reason: "not_positive" });
  });

  it("groups into overdue / due soon / upcoming / paid", () => {
    const views = [
      toReceivableView(receivable({ id: "a", dueDate: "2026-09-01" }), [], TODAY),
      toReceivableView(receivable({ id: "b", dueDate: "2026-09-15" }), [], TODAY),
      toReceivableView(receivable({ id: "c", dueDate: "2026-11-01" }), [], TODAY),
      toReceivableView(receivable({ id: "d", dueDate: "2026-09-10" }), [{ amount: 121_000, voidedAt: null }], TODAY),
    ];
    expect(groupByBucket(views).map((g) => [g.bucket, g.items.map((i) => i.id)])).toEqual([["overdue", ["a"]], ["due_soon", ["b"]], ["upcoming", ["c"]], ["paid", ["d"]]]);
  });
});

// ---------------------------------------------------------------------------
// 13–16. Payment schedule and contract reconciliation
// ---------------------------------------------------------------------------
describe("payment schedule", () => {
  it("default 50/30/20 terms generate the right net amounts that add up exactly", () => {
    const lines = generateSchedule(300_000, [50, 30, 20], { vatRate: 21, applyVat: false, startDate: TODAY, endDate: null, label: (i) => `P${i + 1}` });
    expect(lines.map((l) => l.netAmount)).toEqual([150_000, 90_000, 60_000]);
    expect(lines.map((l) => l.amount)).toEqual([150_000, 90_000, 60_000]);
    expect(lines.map((l) => l.dueDate)).toEqual(["2026-09-08", "2026-10-08", "2026-11-07"]);
    expect(splitContract(100, [33.33, 33.33, 33.34]).reduce((s, n) => s + n, 0)).toBe(100);
    expect(splitContract(1_000, [33, 33, 34])).toEqual([330, 330, 340]);
    // same split rule as Business Settings' helper
    expect(splitByPaymentTerms(300_000, [50, 30, 20])).toEqual([150_000, 90_000, 60_000]);
  });

  it("schedule totals reconcile with the contract value", () => {
    const lines = generateSchedule(345_000, [50, 30, 20], { vatRate: 21, applyVat: true, startDate: TODAY, endDate: "2026-12-08", label: (i) => `P${i + 1}` });
    const views = lines.map((l, i) => toReceivableView(receivable({ id: `s${i}`, netAmount: l.netAmount, amount: l.amount, vatRate: l.vatRate, dueDate: l.dueDate }), [], TODAY));
    const rec = reconcileContract({ currency: "CZK", baselineRevenue: 300_000, approvedChangeRevenue: 45_000 }, views);
    expect(rec.contractValue).toBe(345_000);
    expect(rec.scheduledNet).toBe(345_000);
    expect(rec.unscheduled).toBe(0);
    expect(rec.overScheduled).toBe(0);
    expect(rec.scheduledGross).toBe(grossAmount(345_000, 21));
    expect(lines.map((l) => l.dueDate)).toEqual(["2026-09-08", "2026-10-24", "2026-12-08"]);
  });

  it("an approved change request that is not scheduled produces an unscheduled-revenue warning", () => {
    const views = [150_000, 90_000, 60_000].map((net, i) => toReceivableView(receivable({ id: `s${i}`, netAmount: net, amount: net, vatRate: 0 }), [], TODAY));
    const rec = reconcileContract({ currency: "CZK", baselineRevenue: 300_000, approvedChangeRevenue: 45_000 }, views);
    expect(rec.unscheduled).toBe(45_000);
    const risks = financeRisks({ today: TODAY, positions: [position("CZK", 1)], forecasts: [], receivables: views, payables: [], recurring: [], projects: [{ projectId: "p1", projectName: "Web", reconciliation: rec }], hrefs });
    expect(risks.find((r) => r.code === "unscheduled_revenue")?.params).toMatchObject({ project: "Web", amount: 45_000, contract: 345_000, scheduled: 300_000 });
    // over-scheduling is detected too; cancelled lines are ignored
    const over = reconcileContract({ currency: "CZK", baselineRevenue: 300_000, approvedChangeRevenue: 0 }, [...views, toReceivableView(receivable({ id: "x", netAmount: 10_000, amount: 10_000 }), [], TODAY), toReceivableView(receivable({ id: "c", netAmount: 999_999, state: "cancelled" }), [], TODAY)]);
    expect(over.overScheduled).toBe(10_000);
  });

  it("changing Business Settings later does not mutate an existing schedule", () => {
    const original = generateSchedule(300_000, [50, 30, 20], { vatRate: 21, applyVat: false, startDate: TODAY, endDate: null, label: (i) => `P${i + 1}` });
    const stored = original.map((l) => ({ ...l })); // what was written to the database
    const later = generateSchedule(300_000, [30, 70], { vatRate: 15, applyVat: false, startDate: TODAY, endDate: null, label: (i) => `P${i + 1}` });
    expect(later.map((l) => l.netAmount)).toEqual([90_000, 210_000]);
    expect(stored.map((l) => l.netAmount)).toEqual([150_000, 90_000, 60_000]); // untouched snapshot
  });
});

// ---------------------------------------------------------------------------
// 17–18. Portfolio margin and currency separation
// ---------------------------------------------------------------------------
describe("portfolio profitability", () => {
  const fin = (currency: Currency, revenue: number, cost: number) => ({ currency, financials: computeFinancials({ project: { currency, baselineRevenue: revenue, baselineDirectCost: cost }, members: [], tasks: [], costs: [], changeRequests: [] }) });

  it("weights the margin by revenue instead of averaging project margins", () => {
    // 90 % margin on a tiny project + 20 % on a big one: average would be 55 %, weighted is ~26 %
    const [czk] = portfolioTotals([fin("CZK", 10_000, 1_000), fin("CZK", 1_000_000, 800_000)], "forecast", ORDER);
    expect(czk.grossProfit).toBe(209_000);
    expect(czk.grossMargin).toBeCloseTo((209_000 / 1_010_000) * 100, 6);
    expect(czk.grossMargin).not.toBeCloseTo(55, 0);
  });

  it("never combines currencies", () => {
    const totals = portfolioTotals([fin("CZK", 300_000, 120_000), fin("EUR", 8_400, 2_000), fin("CZK", 100_000, 50_000)], "baseline", ORDER);
    expect(totals.map((t) => [t.currency, t.projects, t.revenue])).toEqual([["CZK", 2, 400_000], ["EUR", 1, 8_400]]);
    const summary = receivablesSummary([toReceivableView(receivable({ currency: "CZK", amount: 100 }), [], TODAY), toReceivableView(receivable({ id: "e", currency: "EUR", amount: 50 }), [], TODAY)], ORDER);
    expect(summary.byCurrency).toEqual({ CZK: expect.objectContaining({ outstanding: 100 }), EUR: expect.objectContaining({ outstanding: 50 }) });
  });

  it("margin health follows Settings thresholds and filters work", () => {
    expect(marginHealth(65, thresholds)).toBe("healthy");
    expect(marginHealth(55, thresholds)).toBe("attention");
    expect(marginHealth(45, thresholds)).toBe("at_risk");
    expect(marginHealth(10, thresholds)).toBe("critical");
    const p = { projectId: "p", name: "Web", clientId: "c", clientName: "Nevoga", status: "active" as const, projectType: "website", currency: "CZK" as Currency, deadline: null, completedAt: null, financials: fin("CZK", 1, 0).financials, marginHealth: "healthy" as const };
    expect(matchesProfitabilityFilters(p, { q: "nevoga" })).toBe(true);
    expect(matchesProfitabilityFilters(p, { scope: "completed" })).toBe(false);
    expect(matchesProfitabilityFilters({ ...p, status: "completed" }, { scope: "active" })).toBe(false);
    expect(matchesProfitabilityFilters({ ...p, status: "completed" }, { scope: "all" })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 19–22. Recurring costs
// ---------------------------------------------------------------------------
describe("recurring costs", () => {
  it("monthly cost expands once per month", () => {
    expect(expandOccurrences(recurring(), "2026-12-31").map((o) => o.date)).toEqual(["2026-10-01", "2026-11-01", "2026-12-01"]);
  });
  it("quarterly cost expands every three months", () => {
    expect(expandOccurrences(recurring({ frequency: "quarterly", nextDueDate: "2026-09-15" }), "2027-06-30").map((o) => o.date)).toEqual(["2026-09-15", "2026-12-15", "2027-03-15", "2027-06-15"]);
  });
  it("yearly cost expands once a year and keeps end-of-month days sane", () => {
    expect(expandOccurrences(recurring({ frequency: "yearly", nextDueDate: "2026-11-30" }), "2028-12-31").map((o) => o.date)).toEqual(["2026-11-30", "2027-11-30", "2028-11-30"]);
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(expandOccurrences(recurring({ isActive: false }), "2027-12-31")).toEqual([]);
  });
  it("a paid recurring cost advances next due and is not counted twice in the forecast", () => {
    const cost = recurring({ currency: "CZK", amount: 12_000, nextDueDate: "2026-09-10" });
    const before = buildForecast({ currency: "CZK", position: position("CZK", 100_000), receivables: [], payables: [], recurring: [cost], today: TODAY, horizonMonths: 3 });
    expect(before.months[0].recurring).toBe(12_000);
    const advanced = { ...cost, nextDueDate: nextDueAfterPayment(cost.nextDueDate, cost.frequency) };
    expect(advanced.nextDueDate).toBe("2026-10-10");
    // the actual OUT cash event is applied to the position; September no longer forecasts the cost
    const paidPosition = cashPosition("CZK", [account({ balanceAsOf: "2026-09-01", currentBalance: 100_000 })], [ev(12_000, "2026-09-08", { direction: "out" })], TODAY);
    const after = buildForecast({ currency: "CZK", position: paidPosition, receivables: [], payables: [], recurring: [advanced], today: TODAY, horizonMonths: 3 });
    expect(after.months[0].starting).toBe(88_000);
    expect(after.months[0].recurring).toBe(0);
    expect(after.months[1].recurring).toBe(12_000);
    expect(after.months[0].ending).toBe(before.months[0].ending);
  });
});

// ---------------------------------------------------------------------------
// 23–27. Cash position, forecast and risks
// ---------------------------------------------------------------------------
describe("cash forecast", () => {
  it("current balance + future inflows − future outflows = projected balance, month by month", () => {
    const rec = [toReceivableView(receivable({ amount: 260_000, netAmount: 260_000, vatRate: 0, dueDate: "2026-09-20" }), [], TODAY), toReceivableView(receivable({ id: "r2", amount: 120_000, netAmount: 120_000, vatRate: 0, dueDate: "2026-10-15" }), [], TODAY)];
    const pay = [toPayableView(payable({ amount: 180_000, dueDate: "2026-09-25" }), [], TODAY), toPayableView(payable({ id: "y2", amount: 240_000, dueDate: "2026-10-05" }), [], TODAY)];
    const f = buildForecast({ currency: "CZK", position: position("CZK", 420_000), receivables: rec, payables: pay, recurring: [], today: TODAY, horizonMonths: 3 });
    expect(f.months.map((m) => [m.month, m.starting, m.inflows, m.outflows, m.ending])).toEqual([
      ["2026-09", 420_000, 260_000, 180_000, 500_000],
      ["2026-10", 500_000, 120_000, 240_000, 380_000],
      ["2026-11", 380_000, 0, 0, 380_000],
    ]);
    expect(f.runway).toEqual({ kind: "positive", months: 3 });
    expect(monthKeys(TODAY, 3)).toEqual(["2026-09", "2026-10", "2026-11"]);
  });

  it("historical cash events before the balance reference do not double-count; later ones do", () => {
    const accounts = [account({ balanceAsOf: "2026-09-05", currentBalance: 420_000 })];
    const events = [
      ev(100_000, "2026-09-01"),                                  // already inside the typed balance
      ev(50_000, "2026-09-06"),                                   // after as-of → added
      ev(20_000, "2026-09-07", { direction: "out" }),             // after as-of → subtracted
      ev(999, "2026-09-07", { accountId: null }),                 // no account: uses newest as-of → added
      ev(5_000, "2026-09-06", { currency: "EUR", accountId: null }), // other currency → ignored
      ev(7_000, "2026-09-06", { voidedAt: "2026-09-07" }),         // voided → ignored
      ev(1, "2026-09-30"),                                        // future → ignored
    ];
    const p = cashPosition("CZK", accounts, events, TODAY);
    expect(p.balance).toBe(420_000);
    expect(p.adjustments).toBe(30_999);
    expect(p.available).toBe(450_999);
    expect(cashPosition("EUR", accounts, events, TODAY)).toMatchObject({ available: 0, unknown: true });
  });

  it("detects cash below zero with an explanation", () => {
    const rec = [toReceivableView(receivable({ amount: 310_000, netAmount: 310_000, vatRate: 0, dueDate: "2026-11-05" }), [], TODAY)];
    const pay = [toPayableView(payable({ amount: 245_000, dueDate: "2026-10-10" }), [], TODAY)];
    const f = buildForecast({ currency: "CZK", position: position("CZK", 163_000), receivables: rec, payables: pay, recurring: [], today: TODAY, horizonMonths: 6 });
    expect(f.runway).toEqual({ kind: "negative", month: "2026-10", ending: -82_000 });
    const risks = financeRisks({ today: TODAY, positions: [position("CZK", 163_000)], forecasts: [f], receivables: rec, payables: pay, recurring: [], projects: [], hrefs });
    const risk = risks.find((r) => r.code === "cash_below_zero");
    expect(risk?.params).toMatchObject({ month: "2026-10", ending: -82_000, outgoing: 245_000, incoming: 0 });
    // a payable due before the receivable inside the 30-day window is reported as its own signal
    const soon = financeRisks({ today: TODAY, positions: [position("CZK", 10_000)], forecasts: [], receivables: [toReceivableView(receivable({ amount: 50_000, netAmount: 50_000, vatRate: 0, dueDate: "2026-09-25" }), [], TODAY)], payables: [toPayableView(payable({ amount: 30_000, dueDate: "2026-09-15" }), [], TODAY)], recurring: [], projects: [], hrefs });
    expect(soon.find((r) => r.code === "payable_before_receivable")?.params).toMatchObject({ date: "2026-09-15", label: "3D freelancer", shortfall: 20_000, incoming: 50_000 });
  });

  it("flags a stale account balance", () => {
    expect(isStale("2026-08-20", TODAY)).toBe(true);
    expect(isStale("2026-08-30", TODAY)).toBe(false);
    const p = cashPosition("CZK", [account({ balanceAsOf: "2026-08-01" })], [], TODAY);
    expect(p.stale).toBe(true);
    const risks = financeRisks({ today: TODAY, positions: [p], forecasts: [], receivables: [], payables: [], recurring: [], projects: [], hrefs });
    expect(risks.find((r) => r.code === "stale_balance")?.params).toMatchObject({ account: "Main CZK", days: 38 });
    expect(financeRisks({ today: TODAY, positions: [cashPosition("CZK", [], [], TODAY)], forecasts: [], receivables: [], payables: [], recurring: [], projects: [], hrefs }).some((r) => r.code === "no_accounts")).toBe(true);
  });

  it("cancelled receivables and payables do not affect the forecast; overdue items land in the current month", () => {
    const rec = [toReceivableView(receivable({ amount: 100, state: "cancelled" }), [], TODAY), toReceivableView(receivable({ id: "o", amount: 40, netAmount: 40, vatRate: 0, dueDate: "2026-07-01" }), [], TODAY)];
    const pay = [toPayableView(payable({ amount: 100, state: "cancelled" }), [], TODAY)];
    const f = buildForecast({ currency: "CZK", position: position("CZK", 0), receivables: rec, payables: pay, recurring: [], today: TODAY, horizonMonths: 2 });
    expect(f.months[0]).toMatchObject({ inflows: 40, outflows: 0, ending: 40 });
    expect(placementMonth("2026-01-01", TODAY)).toBe("2026-09");
    expect(placementMonth("2026-12-01", TODAY)).toBe("2026-12");
    const overdueRisk = financeRisks({ today: TODAY, positions: [position("CZK", 0)], forecasts: [], receivables: rec, payables: [], recurring: [], projects: [], hrefs }).find((r) => r.code === "overdue_receivable");
    expect(overdueRisk?.params).toMatchObject({ amount: 40, count: 1, label: "Payment 1" });
  });
});

// ---------------------------------------------------------------------------
// 28–30. VAT and what is NOT cash
// ---------------------------------------------------------------------------
describe("VAT and non-cash sources", () => {
  it("VAT gross cash amount is correct when enabled and zero when overridden", () => {
    expect(grossAmount(100_000, 21)).toBe(121_000);
    expect(grossAmount(100_000, 0)).toBe(100_000);
    const withVat = generateSchedule(100_000, [100], { vatRate: 21, applyVat: true, startDate: TODAY, endDate: null, label: () => "All" });
    expect(withVat[0]).toMatchObject({ netAmount: 100_000, vatRate: 21, amount: 121_000 });
    const noVat = generateSchedule(100_000, [100], { vatRate: 21, applyVat: false, startDate: TODAY, endDate: null, label: () => "All" });
    expect(noVat[0]).toMatchObject({ netAmount: 100_000, vatRate: 0, amount: 100_000 });
  });

  it("VAT never changes project profitability: reconciliation compares NET amounts", () => {
    const f = computeFinancials({ project: { currency: "CZK", baselineRevenue: 100_000, baselineDirectCost: 40_000 }, members: [], tasks: [], costs: [], changeRequests: [] });
    const view = toReceivableView(receivable({ netAmount: 100_000, vatRate: 21, amount: 121_000 }), [{ amount: 121_000, voidedAt: null }], TODAY);
    const rec = reconcileContract({ currency: "CZK", baselineRevenue: f.baseline.revenue, approvedChangeRevenue: 0 }, [view]);
    expect(f.baseline.grossMargin).toBe(60);
    expect(rec.unscheduled).toBe(0);
    expect(rec.receivedGross).toBe(121_000);
    // received cash (121 000) is not revenue: the project keeps 100 000 / 60 %
    expect(f.baseline.revenue).toBe(100_000);
  });

  it("only real receivables and payables feed the overview — pipeline deals and estimates are not inputs", () => {
    const o = currencyOverview({ currency: "CZK", position: position("CZK", 420_000), receivables: [toReceivableView(receivable({ amount: 121_000, dueDate: "2026-09-20" }), [], TODAY)], payables: [toPayableView(payable(), [], TODAY)], recurring: [recurring({ currency: "CZK", amount: 12_000, nextDueDate: "2026-09-10" })], projects: [{ currency: "CZK", status: "active", financials: computeFinancials({ project: { currency: "CZK", baselineRevenue: 300_000, baselineDirectCost: 120_000 }, members: [], tasks: [], costs: [], changeRequests: [] }) }], today: TODAY });
    expect(o).toMatchObject({ expectedIn30: 121_000, expectedOut30: 37_000, net30: 84_000, overdueReceivables: 0, unpaidPayables: 25_000, activeProjects: 1, forecastGrossProfit: 180_000, forecastGrossMargin: 60 });
    const keys = Object.keys(o);
    expect(keys.some((k) => /pipeline|deal|estimate|proposal/i.test(k))).toBe(false);
  });

  it("item filters", () => {
    const v: ReceivableView | PayableView = toReceivableView(receivable(), [], TODAY);
    expect(matchesItemFilters(v, { q: "nevoga payment" })).toBe(true);
    expect(matchesItemFilters(v, { currency: "EUR" })).toBe(false);
    expect(matchesItemFilters(v, { status: "scheduled" })).toBe(true);
    expect(matchesItemFilters(v, { dueBefore: "2026-09-01" })).toBe(false);
    expect(daysBetween("2026-09-08", "2026-09-20")).toBe(12);
  });
});
