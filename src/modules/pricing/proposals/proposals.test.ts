import { describe, expect, it } from "vitest";

import type { CostItemInput } from "../types";
import { fitToTarget, itemAmount, proposalTotals } from "./calculations";
import { templateProposal } from "./template";
import type { ProposalItem, TemplateLabels } from "./types";
import { validateProposal } from "./validation";

const labels: TemplateLabels = {
  intro: "intro", notes: "notes", lineDescription: "line",
  phases: [
    { title: "Discovery", description: "d", share: 10 },
    { title: "Design", description: "d", share: 35 },
    { title: "Development", description: "d", share: 40 },
    { title: "Launch", description: "d", share: 15 },
  ],
};
const item = (over: Partial<ProposalItem> & { id: string }): ProposalItem => ({ title: "x", description: "", kind: "fixed", hours: 0, rate: 0, amount: 0, quantity: 0, unitPrice: 0, unitLabel: null, ...over });

describe("proposal totals", () => {
  it("adds hourly and fixed lines and applies VAT", () => {
    const items = [item({ id: "a", kind: "hourly", hours: 10, rate: 1500 }), item({ id: "b", amount: 25000 })];
    expect(itemAmount(items[0])).toBe(15000);
    expect(proposalTotals(items, 21)).toEqual({ subtotal: 40000, vat: 8400, total: 48400 });
    expect(proposalTotals(items, 0).total).toBe(40000);
    expect(itemAmount(item({ id: "u", kind: "unit", quantity: 300, unitPrice: 900 }))).toBe(270000);
  });

  it("fits fixed lines to a target and puts rounding on the last fixed line", () => {
    const items = [item({ id: "a", amount: 100 }), item({ id: "b", amount: 100 }), item({ id: "c", amount: 100 })];
    const fitted = fitToTarget(items, 1000);
    expect(fitted.map((i) => i.amount)).toEqual([333, 333, 334]);
    // hourly lines are untouched, fixed lines absorb the rest
    const mixed = fitToTarget([item({ id: "h", kind: "hourly", hours: 10, rate: 100 }), item({ id: "f", amount: 50 })], 2000);
    expect(mixed.map((i) => itemAmount(i))).toEqual([1000, 1000]);
    expect(fitToTarget(items, 0)).toBe(items);
  });
});

describe("template proposal", () => {
  const cost = (over: Partial<CostItemInput> & { name: string }): CostItemInput => ({ kind: "hourly", hours: 0, hourlyRate: 0, fixedAmount: 0, percent: 0, quantity: 0, unitCost: 0, unitLabel: null, ...over });

  it("marks cost lines up so the plan adds up to the client price", () => {
    const p = templateProposal({
      projectName: "Site", clientName: "ACME", currency: "CZK", revenue: 200000, targetMargin: 50,
      items: [cost({ name: "Design", hours: 40, hourlyRate: 1000 }), cost({ name: "Development", hours: 60, hourlyRate: 1000 }), cost({ name: "Sales", kind: "percent", percent: 10 })],
    }, labels);
    // costs: 40 000 + 60 000 + 20 000 = 120 000 → factor 1.667
    expect(p.items.map((i) => i.title)).toEqual(["Design", "Development", "Sales"]);
    expect(p.items[0]).toMatchObject({ kind: "hourly", hours: 40, rate: 1667 });
    const total = proposalTotals(p.items, 0).subtotal;
    expect(total).toBe(200000);
    expect(p.title).toBe("Site");
  });

  it("keeps unit cost lines as unit lines with a sell price per unit", () => {
    const p = templateProposal({ projectName: "300 renders", clientName: null, currency: "CZK", revenue: 270000, targetMargin: 40, items: [cost({ name: "3D artist", kind: "unit", quantity: 300, unitCost: 500, unitLabel: "model" })] }, labels);
    expect(p.items[0]).toMatchObject({ kind: "unit", quantity: 300, unitPrice: 900, unitLabel: "model", amount: 270000 });
  });

  it("uses one unit line for per-unit estimates without cost lines", () => {
    const p = templateProposal({ projectName: "300 renders", clientName: null, currency: "CZK", revenue: 270000, targetMargin: 40, items: [], unitCount: 300, unitPrice: 900, unitLabel: "ks" }, labels);
    expect(p.items).toHaveLength(1);
    expect(p.items[0]).toMatchObject({ kind: "unit", quantity: 300, unitPrice: 900, amount: 270000 });
  });

  it("falls back to standard phases without cost lines", () => {
    const p = templateProposal({ projectName: "Brand", clientName: null, currency: "EUR", revenue: 10000, targetMargin: 50, items: [] }, labels);
    expect(p.items.map((i) => i.title)).toEqual(["Discovery", "Design", "Development", "Launch"]);
    expect(p.items.map((i) => i.amount)).toEqual([1000, 3500, 4000, 1500]);
  });
});

describe("validateProposal", () => {
  const msg = { titleRequired: "title", invalidNumber: "num", itemTitleRequired: "item", vatRange: "vat", invalidDate: "date" };

  it("normalises items and recomputes amounts", () => {
    const r = validateProposal({ title: " Plan ", currency: "EUR", vatRate: "21", validUntil: "2026-10-31", items: [{ id: "a", title: "Design", kind: "hourly", hours: "10", rate: "80", amount: "999" }, { title: "Launch", kind: "fixed", amount: "500" }] }, msg);
    expect(r.errors).toBeUndefined();
    expect(r.data?.items[0]).toMatchObject({ id: "a", kind: "hourly", hours: 10, rate: 80, amount: 800 });
    expect(r.data?.items[1]).toMatchObject({ kind: "fixed", hours: 0, rate: 0, amount: 500 });
    expect(r.data?.vatRate).toBe(21);
    const u = validateProposal({ title: "u", vatRate: "0", items: [{ title: "Renders", kind: "unit", quantity: "300", unitPrice: "900", unitLabel: "ks" }] }, msg);
    expect(u.data?.items[0]).toMatchObject({ kind: "unit", quantity: 300, unitPrice: 900, unitLabel: "ks", amount: 270000 });
  });

  it("reports missing titles, bad VAT and bad dates", () => {
    expect(validateProposal({ title: "", vatRate: "150", validUntil: "31.10.2026", items: [{ title: "", kind: "fixed", amount: "1" }] }, msg).errors?.fieldErrors)
      .toEqual({ title: "title", vatRate: "vat", validUntil: "date", "items.0.title": "item" });
  });
});
