import type { ProposalItem, ProposalTotals } from "./types";

/** Pure maths for pricing plans (tested). Money is kept in whole currency units for the client. */

export function newItemId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Amount of one line: hourly = hours × rate, unit = quantity × unit price, fixed lines carry their amount. */
export function itemAmount(item: Pick<ProposalItem, "kind" | "hours" | "rate" | "amount" | "quantity" | "unitPrice">): number {
  if (item.kind === "hourly") return round2(item.hours * item.rate);
  if (item.kind === "unit") return round2(item.quantity * item.unitPrice);
  return round2(item.amount);
}

/** Recomputes the stored `amount` so the JSON is always consistent. */
export function normalizeItem(item: ProposalItem): ProposalItem {
  return { ...item, amount: itemAmount(item) };
}

export function proposalTotals(items: readonly Pick<ProposalItem, "kind" | "hours" | "rate" | "amount" | "quantity" | "unitPrice">[], vatRate: number): ProposalTotals {
  const subtotal = round2(items.reduce((s, i) => s + itemAmount(i), 0));
  const vat = round2((subtotal * vatRate) / 100);
  return { subtotal, vat, total: round2(subtotal + vat) };
}

/**
 * Scales fixed-line amounts so the plan adds up to `target` (e.g. the client
 * price). Rounds to whole units and puts the rounding difference on the last
 * fixed line. Hourly lines are left alone (they are hours × rate by nature).
 */
export function fitToTarget(items: ProposalItem[], target: number): ProposalItem[] {
  if (target <= 0) return items;
  const hourlyTotal = items.filter((i) => i.kind !== "fixed").reduce((s, i) => s + itemAmount(i), 0);
  const fixed = items.filter((i) => i.kind === "fixed");
  const fixedTotal = fixed.reduce((s, i) => s + i.amount, 0);
  const remaining = target - hourlyTotal;
  if (!fixed.length || fixedTotal <= 0 || remaining <= 0) return items;
  const factor = remaining / fixedTotal;
  const scaled = items.map((i) => (i.kind === "fixed" ? { ...i, amount: Math.round(i.amount * factor) } : i));
  const lastFixed = [...scaled].reverse().find((i) => i.kind === "fixed");
  if (lastFixed) {
    const diff = Math.round(remaining) - scaled.filter((i) => i.kind === "fixed").reduce((s, i) => s + i.amount, 0);
    lastFixed.amount += diff;
  }
  return scaled;
}
