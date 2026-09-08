/**
 * Payment schedule generation and contract reconciliation.
 *
 * A schedule is a SNAPSHOT: it is generated once from the contract value and
 * the payment terms of that moment, then owned by the project. Later changes
 * to Business Settings or approved change requests never rewrite it — the
 * reconciliation below only WARNS about the difference.
 */
import { SCHEDULE_GAP_DAYS } from "../constants";
import type { ContractReconciliation, ReceivableView, ScheduleLine } from "../types";
import type { Currency } from "@/types/database";
import { addDays, daysBetween, round2 } from "./dates";

/** Net → gross expected in the bank. VAT is cash-flow visibility only. */
export function grossAmount(net: number, vatRate: number): number {
  return round2(net * (1 + vatRate / 100));
}

/** Instalment net amounts that add up EXACTLY to the contract value (rounding goes to the last line). */
export function splitContract(contractValue: number, terms: readonly number[]): number[] {
  if (!terms.length) return [];
  const parts = terms.map((pct) => round2((contractValue * pct) / 100));
  const drift = round2(contractValue - parts.reduce((s, p) => s + p, 0));
  parts[parts.length - 1] = round2(parts[parts.length - 1] + drift);
  return parts;
}

/**
 * Default due dates: the first instalment today; the rest spread evenly to the
 * project deadline when there is one in the future, otherwise every 30 days.
 */
export function defaultDueDates(count: number, startDate: string, endDate: string | null): string[] {
  if (count <= 0) return [];
  if (count === 1) return [startDate];
  const span = endDate ? daysBetween(startDate, endDate) : 0;
  if (span > 0) return Array.from({ length: count }, (_, i) => addDays(startDate, Math.round((span * i) / (count - 1))));
  return Array.from({ length: count }, (_, i) => addDays(startDate, i * SCHEDULE_GAP_DAYS));
}

export function generateSchedule(
  contractValue: number,
  terms: readonly number[],
  opts: { vatRate: number; applyVat: boolean; startDate: string; endDate: string | null; label: (index: number, percent: number) => string }
): ScheduleLine[] {
  const nets = splitContract(contractValue, terms);
  const dates = defaultDueDates(nets.length, opts.startDate, opts.endDate);
  const vat = opts.applyVat ? opts.vatRate : 0;
  return nets.map((net, i) => ({ label: opts.label(i, terms[i]), percent: terms[i], netAmount: net, vatRate: vat, amount: grossAmount(net, vat), dueDate: dates[i] }));
}

/**
 * Contract value (baseline + approved change requests, from Projects) against
 * the open receivables (net) of the project.
 */
export function reconcileContract(
  project: { currency: Currency; baselineRevenue: number; approvedChangeRevenue: number },
  receivables: readonly Pick<ReceivableView, "state" | "netAmount" | "amount" | "received" | "outstanding" | "status" | "dueDate" | "label">[]
): ContractReconciliation {
  const open = receivables.filter((r) => r.state !== "cancelled");
  const contractValue = round2(project.baselineRevenue + project.approvedChangeRevenue);
  const scheduledNet = round2(open.reduce((s, r) => s + r.netAmount, 0));
  const diff = round2(contractValue - scheduledNet);
  const unpaid = open.filter((r) => r.outstanding > 0).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const overdue = unpaid.filter((r) => r.status === "overdue");
  return {
    currency: project.currency,
    contractValue,
    baselineRevenue: project.baselineRevenue,
    approvedChangeRevenue: project.approvedChangeRevenue,
    scheduledNet,
    scheduledGross: round2(open.reduce((s, r) => s + r.amount, 0)),
    receivedGross: round2(open.reduce((s, r) => s + r.received, 0)),
    outstandingGross: round2(open.reduce((s, r) => s + r.outstanding, 0)),
    unscheduled: diff > 0 ? diff : 0,
    overScheduled: diff < 0 ? -diff : 0,
    nextDue: unpaid[0] ? { label: unpaid[0].label, amount: unpaid[0].outstanding, dueDate: unpaid[0].dueDate } : null,
    overdueCount: overdue.length,
    overdueAmount: round2(overdue.reduce((s, r) => s + r.outstanding, 0)),
  };
}
