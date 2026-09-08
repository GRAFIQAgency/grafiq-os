/**
 * Recurring operating costs are stored ONCE as a definition. Future
 * occurrences are expanded here as derived data for the forecast; nothing is
 * materialised. Recording a payment advances `nextDueDate`, so a paid
 * occurrence disappears from the forecast and is never counted twice.
 */
import type { RecurringCost, RecurringFrequency } from "../types";
import { addMonths } from "./dates";

const MONTHS: Record<RecurringFrequency, number> = { monthly: 1, quarterly: 3, yearly: 12 };

export function addFrequency(iso: string, frequency: RecurringFrequency, times = 1): string {
  return addMonths(iso, MONTHS[frequency] * times);
}

/** The next unpaid occurrence after paying the one at `nextDueDate`. */
export function nextDueAfterPayment(nextDueDate: string, frequency: RecurringFrequency): string {
  return addFrequency(nextDueDate, frequency);
}

export interface Occurrence {
  costId: string;
  name: string;
  amount: number;
  date: string;
}

/**
 * Occurrences from `nextDueDate` up to and including `until`. An occurrence
 * dated before `from` is still unpaid (it was never advanced), so it is kept —
 * the forecast places it in the current month.
 */
export function expandOccurrences(cost: Pick<RecurringCost, "id" | "name" | "amount" | "frequency" | "nextDueDate" | "isActive">, until: string, limit = 60): Occurrence[] {
  if (!cost.isActive || cost.amount <= 0) return [];
  const out: Occurrence[] = [];
  let date = cost.nextDueDate;
  while (date <= until && out.length < limit) {
    out.push({ costId: cost.id, name: cost.name, amount: cost.amount, date });
    date = addFrequency(date, cost.frequency);
  }
  return out;
}

/** Monthly equivalent, for the "operating costs per month" figure. */
export function monthlyEquivalent(amount: number, frequency: RecurringFrequency): number {
  return amount / MONTHS[frequency];
}
