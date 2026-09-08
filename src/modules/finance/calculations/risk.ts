/**
 * Explainable finance risk signals. Every signal carries the numbers that
 * explain WHY, so the UI can say e.g. "October projected CZK balance −82 000:
 * 245 000 of payments are due before 310 000 of receivables arrive".
 */
import { OVERVIEW_WINDOW_DAYS } from "../constants";
import type { CashForecast, CashPosition, ContractReconciliation, FinanceRisk, PayableView, ReceivableView, RecurringCost } from "../types";
import type { Currency } from "@/types/database";
import { addDays, daysBetween, monthEnd, round2 } from "./dates";
import { expandOccurrences } from "./recurring";

export interface RiskInput {
  today: string;
  positions: readonly CashPosition[];
  forecasts: readonly CashForecast[];
  receivables: readonly ReceivableView[];
  payables: readonly PayableView[];
  recurring: readonly Pick<RecurringCost, "id" | "name" | "amount" | "currency" | "frequency" | "nextDueDate" | "isActive">[];
  projects: readonly { projectId: string; projectName: string; reconciliation: ContractReconciliation }[];
  /** Base path of the Finance module, for action links. */
  hrefs: { receivables: string; payables: string; cashflow: string; project: (id: string) => string };
}

/** Within the next N days, does a payment leave before the money that covers it arrives? */
export function payableBeforeReceivable(currency: Currency, input: RiskInput, days = OVERVIEW_WINDOW_DAYS): FinanceRisk | null {
  const position = input.positions.find((p) => p.currency === currency);
  if (!position || position.unknown) return null;
  const until = addDays(input.today, days);
  type Move = { date: string; amount: number; label: string; kind: "in" | "out" };
  const moves: Move[] = [];
  for (const r of input.receivables) {
    if (r.currency !== currency || r.state === "cancelled" || r.outstanding <= 0) continue;
    const date = r.expectedDate ?? r.dueDate;
    if (date <= until) moves.push({ date: date < input.today ? input.today : date, amount: r.outstanding, label: r.label, kind: "in" });
  }
  for (const p of input.payables) {
    if (p.currency !== currency || p.state === "cancelled" || p.outstanding <= 0) continue;
    if (p.dueDate <= until) moves.push({ date: p.dueDate < input.today ? input.today : p.dueDate, amount: p.outstanding, label: p.label, kind: "out" });
  }
  for (const c of input.recurring) {
    if (c.currency !== currency) continue;
    for (const o of expandOccurrences(c, until)) moves.push({ date: o.date < input.today ? input.today : o.date, amount: o.amount, label: o.name, kind: "out" });
  }
  // Same day: outflows first (conservative).
  moves.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === b.kind ? 0 : a.kind === "out" ? -1 : 1));
  let running = position.available;
  for (const m of moves) {
    running = round2(running + (m.kind === "in" ? m.amount : -m.amount));
    if (running < 0 && m.kind === "out") {
      // Everything still expected from clients on or after that day (not limited to the window), so the reason is complete.
      const laterIn = round2(input.receivables.filter((r) => r.currency === currency && r.state !== "cancelled" && r.outstanding > 0 && (r.expectedDate ?? r.dueDate) >= m.date).reduce((s, r) => s + r.outstanding, 0));
      return {
        code: "payable_before_receivable", severity: "risk", currency, href: input.hrefs.cashflow,
        params: { date: m.date, label: m.label, amount: m.amount, shortfall: -running, incoming: laterIn },
      };
    }
  }
  return null;
}

export function financeRisks(input: RiskInput): FinanceRisk[] {
  const out: FinanceRisk[] = [];
  const currencies = new Set<Currency>([...input.positions.map((p) => p.currency), ...input.forecasts.map((f) => f.currency)]);

  if (!input.positions.some((p) => !p.unknown)) {
    out.push({ code: "no_accounts", severity: "warning", currency: null, params: {}, href: input.hrefs.cashflow });
  }

  for (const f of input.forecasts) {
    if (f.runway.kind !== "negative") continue;
    const m = f.months.find((x) => x.month === (f.runway as { month: string }).month);
    if (!m) continue;
    // Explain with what is due up to and including that month.
    const upTo = f.months.filter((x) => x.month <= m.month);
    out.push({
      code: "cash_below_zero", severity: "risk", currency: f.currency, href: input.hrefs.cashflow,
      params: { month: m.month, ending: m.ending, outgoing: round2(upTo.reduce((s, x) => s + x.outflows, 0)), incoming: round2(upTo.reduce((s, x) => s + x.inflows, 0)), starting: f.months[0].starting },
    });
  }

  for (const currency of currencies) {
    const negativeMonth = input.forecasts.find((f) => f.currency === currency && f.runway.kind === "negative");
    const firstMonthNegative = negativeMonth && negativeMonth.months[0]?.ending < 0;
    if (!firstMonthNegative) {
      const r = payableBeforeReceivable(currency, input);
      if (r) out.push(r);
    }
    const overdue = input.receivables.filter((r) => r.currency === currency && r.status === "overdue");
    if (overdue.length) {
      const largest = [...overdue].sort((a, b) => b.outstanding - a.outstanding)[0];
      out.push({
        code: "overdue_receivable", severity: "risk", currency, href: input.hrefs.receivables,
        params: { amount: round2(overdue.reduce((s, r) => s + r.outstanding, 0)), count: overdue.length, largest: largest.outstanding, label: largest.label, client: largest.clientName ?? largest.projectName ?? "—", days: largest.daysOverdue },
      });
    }
  }

  for (const p of input.positions) {
    for (const a of p.accounts) {
      if (a.stale) out.push({ code: "stale_balance", severity: "warning", currency: p.currency, href: input.hrefs.cashflow, params: { account: a.name, days: daysBetween(a.asOf, input.today), asOf: a.asOf } });
    }
  }

  for (const p of input.projects) {
    const r = p.reconciliation;
    if (r.unscheduled > 0) out.push({ code: "unscheduled_revenue", severity: "warning", currency: r.currency, href: input.hrefs.project(p.projectId), params: { project: p.projectName, amount: r.unscheduled, contract: r.contractValue, scheduled: r.scheduledNet } });
    if (r.overScheduled > 0) out.push({ code: "over_scheduled", severity: "warning", currency: r.currency, href: input.hrefs.project(p.projectId), params: { project: p.projectName, amount: r.overScheduled, contract: r.contractValue, scheduled: r.scheduledNet } });
  }

  const rank = { risk: 0, warning: 1 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

/** Month keys are compared as strings; expose the month end for UI ranges. */
export { monthEnd };
