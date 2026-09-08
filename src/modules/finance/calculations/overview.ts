/** Overview cards per currency — the "company financial state in seconds". */
import { OVERVIEW_WINDOW_DAYS } from "../constants";
import type { CashPosition, CurrencyOverview, PayableView, PayablesSummary, ProjectProfitability, ReceivableView, ReceivablesSummary, RecurringCost } from "../types";
import type { Currency } from "@/types/database";
import { addDays, round2 } from "./dates";
import { isInDelivery } from "./portfolio";
import { expandOccurrences } from "./recurring";

export interface OverviewInput {
  currency: Currency;
  position: CashPosition;
  receivables: readonly ReceivableView[];
  payables: readonly PayableView[];
  recurring: readonly Pick<RecurringCost, "id" | "name" | "amount" | "currency" | "frequency" | "nextDueDate" | "isActive">[];
  projects: readonly Pick<ProjectProfitability, "currency" | "status" | "financials">[];
  today: string;
  windowDays?: number;
}

export function currencyOverview(input: OverviewInput): CurrencyOverview {
  const { currency, today } = input;
  const until = addDays(today, input.windowDays ?? OVERVIEW_WINDOW_DAYS);
  const rec = input.receivables.filter((r) => r.currency === currency && r.state !== "cancelled" && r.outstanding > 0);
  const pay = input.payables.filter((p) => p.currency === currency && p.state !== "cancelled" && p.outstanding > 0);
  const inWindow = rec.filter((r) => (r.expectedDate ?? r.dueDate) <= until);
  const outWindow = pay.filter((p) => p.dueDate <= until);
  const recurringWindow = input.recurring.filter((c) => c.currency === currency).flatMap((c) => expandOccurrences(c, until));
  const overdue = rec.filter((r) => r.status === "overdue");
  const active = input.projects.filter((p) => p.currency === currency && isInDelivery(p.status));
  const gp = round2(active.reduce((s, p) => s + p.financials.forecast.grossProfit, 0));
  const revenue = round2(active.reduce((s, p) => s + p.financials.forecast.revenue, 0));
  const expectedIn30 = round2(inWindow.reduce((s, r) => s + r.outstanding, 0));
  const expectedOut30 = round2(outWindow.reduce((s, p) => s + p.outstanding, 0) + recurringWindow.reduce((s, o) => s + o.amount, 0));
  return {
    currency, cash: input.position, expectedIn30, expectedOut30, net30: round2(expectedIn30 - expectedOut30),
    overdueReceivables: round2(overdue.reduce((s, r) => s + r.outstanding, 0)), overdueReceivableCount: overdue.length,
    unpaidPayables: round2(pay.reduce((s, p) => s + p.outstanding, 0)), unpaidPayableCount: pay.length,
    activeProjects: active.length, forecastGrossProfit: gp, forecastGrossMargin: revenue > 0 ? (gp / revenue) * 100 : null,
  };
}

export function receivablesSummary(items: readonly ReceivableView[], order: readonly Currency[]): ReceivablesSummary {
  const byCurrency: ReceivablesSummary["byCurrency"] = {};
  for (const currency of order) {
    const open = items.filter((r) => r.currency === currency && r.state !== "cancelled" && r.outstanding > 0);
    if (!open.length) continue;
    const overdue = open.filter((r) => r.status === "overdue");
    byCurrency[currency] = {
      outstanding: round2(open.reduce((s, r) => s + r.outstanding, 0)), overdue: round2(overdue.reduce((s, r) => s + r.outstanding, 0)), overdueCount: overdue.length,
      dueSoon: round2(open.filter((r) => r.bucket === "due_soon").reduce((s, r) => s + r.outstanding, 0)), openCount: open.length,
    };
  }
  return { byCurrency };
}

export function payablesSummary(items: readonly PayableView[], order: readonly Currency[]): PayablesSummary {
  const byCurrency: PayablesSummary["byCurrency"] = {};
  for (const currency of order) {
    const open = items.filter((p) => p.currency === currency && p.state !== "cancelled" && p.outstanding > 0);
    if (!open.length) continue;
    const overdue = open.filter((p) => p.status === "overdue");
    byCurrency[currency] = {
      outstanding: round2(open.reduce((s, p) => s + p.outstanding, 0)), overdue: round2(overdue.reduce((s, p) => s + p.outstanding, 0)), overdueCount: overdue.length,
      dueSoon: round2(open.filter((p) => p.bucket === "due_soon").reduce((s, p) => s + p.outstanding, 0)), openCount: open.length,
    };
  }
  return { byCurrency };
}

const lc = (s: string | null | undefined) => (s ?? "").toLowerCase();

export function matchesItemFilters(
  item: { label: string; projectId: string | null; projectName: string | null; currency: Currency; status: string; dueDate: string; clientId?: string | null; clientName?: string | null; payeeName?: string | null; category?: string },
  f: { q?: string; projectId?: string; clientId?: string; currency?: Currency; status?: string; dueBefore?: string; category?: string }
): boolean {
  if (f.q && !f.q.toLowerCase().split(/\s+/).every((w) => `${lc(item.label)} ${lc(item.projectName)} ${lc(item.clientName)} ${lc(item.payeeName)}`.includes(w))) return false;
  if (f.projectId && item.projectId !== f.projectId) return false;
  if (f.clientId && item.clientId !== f.clientId) return false;
  if (f.currency && item.currency !== f.currency) return false;
  if (f.status && item.status !== f.status) return false;
  if (f.dueBefore && item.dueDate > f.dueBefore) return false;
  if (f.category && item.category !== f.category) return false;
  return true;
}
