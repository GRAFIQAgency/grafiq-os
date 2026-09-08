/**
 * Receivable / payable status is DERIVED from the expected amount, the cash
 * events linked to it and today's date. Nothing stores "paid = true".
 */
import { DUE_SOON_DAYS } from "../constants";
import type { CashEvent, DueBucket, FinanceItemState, Payable, PayableStatus, PayableView, Receivable, ReceivableStatus, ReceivableView } from "../types";
import { daysBetween, round2 } from "./dates";

type EventLike = Pick<CashEvent, "amount" | "voidedAt">;

/** Σ amount of non-voided events. */
export function sumEvents(events: readonly EventLike[]): number {
  return round2(events.reduce((s, e) => s + (e.voidedAt ? 0 : e.amount), 0));
}

export function outstandingOf(expected: number, settled: number): number {
  return round2(Math.max(0, expected - settled));
}

export function daysOverdue(dueDate: string, today: string): number {
  return Math.max(0, daysBetween(dueDate, today));
}

export function receivableStatus(
  r: Pick<Receivable, "state" | "amount" | "dueDate" | "invoiceReference" | "invoiceSentAt">,
  received: number,
  today: string
): ReceivableStatus {
  if (r.state === "cancelled") return "cancelled";
  const outstanding = outstandingOf(r.amount, received);
  if (outstanding === 0) return "paid";
  if (r.dueDate < today) return "overdue";
  if (received > 0) return "partially_paid";
  if (r.invoiceSentAt || r.invoiceReference) return "invoiced";
  return "scheduled";
}

export function payableStatus(p: Pick<Payable, "state" | "amount" | "dueDate">, paid: number, today: string): PayableStatus {
  if (p.state === "cancelled") return "cancelled";
  const outstanding = outstandingOf(p.amount, paid);
  if (outstanding === 0) return "paid";
  if (p.dueDate < today) return "overdue";
  if (paid > 0) return "partially_paid";
  return "scheduled";
}

export function bucketOf(status: ReceivableStatus | PayableStatus, dueDate: string, today: string, dueSoonDays = DUE_SOON_DAYS): DueBucket {
  if (status === "cancelled") return "cancelled";
  if (status === "paid") return "paid";
  if (status === "overdue") return "overdue";
  return daysBetween(today, dueDate) <= dueSoonDays ? "due_soon" : "upcoming";
}

export function toReceivableView(r: Receivable, events: readonly EventLike[], today: string): ReceivableView {
  const received = sumEvents(events);
  const status = receivableStatus(r, received, today);
  return {
    ...r, received, outstanding: status === "cancelled" ? 0 : outstandingOf(r.amount, received), status,
    daysOverdue: status === "overdue" ? daysOverdue(r.dueDate, today) : 0,
    bucket: bucketOf(status, r.dueDate, today),
  };
}

export function toPayableView(p: Payable, events: readonly EventLike[], today: string): PayableView {
  const paid = sumEvents(events);
  const status = payableStatus(p, paid, today);
  return {
    ...p, paid, outstanding: status === "cancelled" ? 0 : outstandingOf(p.amount, paid), status,
    daysOverdue: status === "overdue" ? daysOverdue(p.dueDate, today) : 0,
    bucket: bucketOf(status, p.dueDate, today),
  };
}

/** Whether a payment of `amount` may be recorded against an item (never silently exceeds what is expected). */
export function paymentAllowed(item: { state: FinanceItemState; amount: number }, settled: number, amount: number): { ok: true } | { ok: false; reason: "cancelled" | "exceeds" | "not_positive"; outstanding: number } {
  const outstanding = outstandingOf(item.amount, settled);
  if (item.state === "cancelled") return { ok: false, reason: "cancelled", outstanding };
  if (!(amount > 0)) return { ok: false, reason: "not_positive", outstanding };
  if (round2(amount) > outstanding) return { ok: false, reason: "exceeds", outstanding };
  return { ok: true };
}

const BUCKET_ORDER: DueBucket[] = ["overdue", "due_soon", "upcoming", "paid", "cancelled"];

/** Groups items by due bucket in operational order; empty buckets are dropped. */
export function groupByBucket<T extends { bucket: DueBucket; dueDate: string }>(items: readonly T[]): { bucket: DueBucket; items: T[] }[] {
  const sorted = [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return BUCKET_ORDER.map((bucket) => ({ bucket, items: sorted.filter((i) => i.bucket === bucket) })).filter((g) => g.items.length);
}
