/**
 * Cash position and forward cash forecast — per currency, never mixed.
 *
 * CURRENT CASH RULE
 *   available = Σ current_balance of active accounts
 *             + Σ non-voided cash events dated AFTER the balance reference and ≤ today
 *   An event linked to an account counts when occurred_at > that account's
 *   balance_as_of; an event without an account counts when occurred_at > the
 *   newest balance_as_of of the currency. Earlier events are assumed to be
 *   already reflected in the typed-in balance (no bank reconciliation).
 *
 * FORECAST RULE
 *   month.starting = previous month.ending (first month: available cash)
 *   + outstanding receivables placed by expected date (or due date)
 *   − outstanding payables placed by due date
 *   − recurring occurrences placed by their date
 *   = month.ending
 *   Anything already due (overdue) is placed in the current month: we still
 *   expect it, and we expect it now.
 */
import { STALE_BALANCE_DAYS } from "../constants";
import type { CashEvent, CashForecast, CashPosition, FinanceAccount, MonthForecast, PayableView, ReceivableView, RecurringCost } from "../types";
import type { Currency } from "@/types/database";
import { daysBetween, monthEnd, monthKey, monthKeys, round2 } from "./dates";
import { expandOccurrences } from "./recurring";

type AccountLike = Pick<FinanceAccount, "id" | "name" | "currency" | "currentBalance" | "balanceAsOf" | "isActive">;
type EventLike = Pick<CashEvent, "direction" | "amount" | "currency" | "occurredAt" | "accountId" | "voidedAt">;

export function isStale(asOf: string, today: string, staleDays = STALE_BALANCE_DAYS): boolean {
  return daysBetween(asOf, today) > staleDays;
}

export function cashPosition(currency: Currency, accounts: readonly AccountLike[], events: readonly EventLike[], today: string): CashPosition {
  const active = accounts.filter((a) => a.currency === currency && a.isActive);
  const asOfById = new Map(active.map((a) => [a.id, a.balanceAsOf]));
  const newestAsOf = active.map((a) => a.balanceAsOf).sort().at(-1) ?? null;
  let adjustments = 0;
  if (newestAsOf) {
    for (const e of events) {
      if (e.currency !== currency || e.voidedAt || e.occurredAt > today) continue;
      const reference = e.accountId ? asOfById.get(e.accountId) : newestAsOf;
      if (!reference) continue; // event on an inactive / foreign account: not part of this position
      if (e.occurredAt > reference) adjustments += e.direction === "in" ? e.amount : -e.amount;
    }
  }
  const balance = round2(active.reduce((s, a) => s + a.currentBalance, 0));
  return {
    currency, balance, adjustments: round2(adjustments), available: round2(balance + adjustments),
    accounts: active.map((a) => ({ id: a.id, name: a.name, balance: a.currentBalance, asOf: a.balanceAsOf, stale: isStale(a.balanceAsOf, today) })),
    stale: active.some((a) => isStale(a.balanceAsOf, today)),
    unknown: active.length === 0,
  };
}

export interface ForecastInput {
  currency: Currency;
  position: CashPosition;
  receivables: readonly Pick<ReceivableView, "currency" | "state" | "outstanding" | "dueDate" | "expectedDate">[];
  payables: readonly Pick<PayableView, "currency" | "state" | "outstanding" | "dueDate">[];
  recurring: readonly Pick<RecurringCost, "id" | "name" | "amount" | "currency" | "frequency" | "nextDueDate" | "isActive">[];
  today: string;
  horizonMonths: number;
}

/** Month an item lands in: its own month, or the current month when it is already due. */
export function placementMonth(date: string, today: string): string {
  return monthKey(date < today ? today : date);
}

export function buildForecast(input: ForecastInput): CashForecast {
  const { currency, today, horizonMonths } = input;
  const keys = monthKeys(today, horizonMonths);
  const until = monthEnd(keys[keys.length - 1]);
  const inflow = new Map<string, number>();
  const outPay = new Map<string, number>();
  const outRec = new Map<string, number>();
  const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);

  for (const r of input.receivables) {
    if (r.currency !== currency || r.state === "cancelled" || r.outstanding <= 0) continue;
    add(inflow, placementMonth(r.expectedDate ?? r.dueDate, today), r.outstanding);
  }
  for (const p of input.payables) {
    if (p.currency !== currency || p.state === "cancelled" || p.outstanding <= 0) continue;
    add(outPay, placementMonth(p.dueDate, today), p.outstanding);
  }
  for (const c of input.recurring) {
    if (c.currency !== currency) continue;
    for (const o of expandOccurrences(c, until)) add(outRec, placementMonth(o.date, today), o.amount);
  }

  let running = input.position.available;
  const months: MonthForecast[] = keys.map((month) => {
    const receivables = round2(inflow.get(month) ?? 0);
    const payables = round2(outPay.get(month) ?? 0);
    const recurring = round2(outRec.get(month) ?? 0);
    const starting = round2(running);
    const ending = round2(starting + receivables - payables - recurring);
    running = ending;
    return { month, starting, receivables, payables, recurring, inflows: receivables, outflows: round2(payables + recurring), ending };
  });
  const negative = months.find((m) => m.ending < 0);
  return {
    currency, horizonMonths, months,
    runway: negative ? { kind: "negative", month: negative.month, ending: negative.ending } : { kind: "positive", months: horizonMonths },
    startingUnknown: input.position.unknown,
  };
}

/** Currencies that appear anywhere in the data (accounts, items, costs), stable order. */
export function currenciesInUse(parts: { currency: Currency }[][], order: readonly Currency[]): Currency[] {
  const set = new Set(parts.flat().map((p) => p.currency));
  return order.filter((c) => set.has(c));
}
