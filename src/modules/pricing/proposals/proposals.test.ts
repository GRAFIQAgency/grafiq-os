import { describe, expect, it } from "vitest";

import type { CostItemInput } from "../types";
import { fitToTarget, itemAmount, proposalTotals } from "./calculations";
import { detectWorkType, templateProposal } from "./template";
import type { ProposalItem, TemplateLabels, WorkType } from "./types";
import { validateProposal } from "./validation";

const phases = (names: string[], shares: number[]) => names.map((title, i) => ({ title, description: "d", share: shares[i] }));
const labels: TemplateLabels = {
  intro: "intro", notes: "notes", lineDescription: "line",
  workTypes: {
    web: { name: "Website", phases: phases(["Discovery", "Wireframes", "Design", "Development", "Launch"], [10, 15, 30, 30, 15]) },
    eshop: { name: "E-shop", phases: phases(["Discovery", "UX", "Design", "Build", "Launch"], [10, 15, 25, 35, 15]) },
    branding: { name: "Branding", phases: phases(["Brand discovery", "Concepts", "Identity", "Applications", "Manual"], [15, 25, 30, 15, 15]) },
    threeD: { name: "3D", phases: phases(["Brief", "Modelling", "Materials", "Renders", "Delivery"], [10, 30, 20, 30, 10]) },
    motion: { name: "Video", phases: phases(["Script", "Style", "Production", "Sound", "Delivery"], [15, 15, 40, 20, 10]) },
    marketing: { name: "Marketing", phases: phases(["Strategy", "Creative", "Setup", "Run", "Report"], [20, 30, 20, 20, 10]) },
    app: { name: "App", phases: phases(["Requirements", "Prototype", "UI", "Development", "Launch"], [10, 20, 20, 40, 10]) },
    other: { name: "Other", phases: phases(["Discovery", "Design", "Development", "Launch"], [10, 35, 40, 15]) },
  },
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

  it("detects the kind of work from names and brief", () => {
    const cases: [string, WorkType][] = [
      ["Webflow site for a hotel", "web"], ["Nový e-shop na Shopify", "eshop"], ["Rebrand + logo manuál", "branding"],
      ["300 product renders 3D", "threeD"], ["Explainer video", "motion"], ["PPC kampaň jaro", "marketing"], ["Mobile app MVP", "app"], ["Something", "other"],
    ];
    for (const [text, type] of cases) expect(detectWorkType(text)).toBe(type);
  });

  it("lays out the standard process for the detected type so the plan adds up to the client price", () => {
    const p = templateProposal({
      projectName: "Web pomoci AI", clientName: "ACME", currency: "CZK", revenue: 200000, targetMargin: 50,
      items: [cost({ name: "Developer", hours: 30, hourlyRate: 1333 })],
    }, labels);
    expect(p.items.map((i) => i.title)).toEqual(["Discovery", "Wireframes", "Design", "Development", "Launch"]);
    expect(p.items.map((i) => i.amount)).toEqual([20000, 30000, 60000, 60000, 30000]);
    expect(proposalTotals(p.items, 0).subtotal).toBe(200000);
    expect(p.title).toBe("Web pomoci AI");
  });

  it("uses the 3D process for render projects and the brief can steer the type", () => {
    expect(templateProposal({ projectName: "Katalog", clientName: null, currency: "CZK", revenue: 100000, targetMargin: 40, items: [cost({ name: "3D artist", hours: 10, hourlyRate: 500 })] }, labels).items[1].title).toBe("Modelling");
    expect(templateProposal({ projectName: "Projekt", clientName: null, currency: "CZK", revenue: 100000, targetMargin: 40, items: [], brief: "krátké explainer video" }, labels).items[2].title).toBe("Production");
  });

  it("uses one unit line for per-unit estimates without cost lines", () => {
    const p = templateProposal({ projectName: "300 renders", clientName: null, currency: "CZK", revenue: 270000, targetMargin: 40, items: [], unitCount: 300, unitPrice: 900, unitLabel: "ks" }, labels);
    expect(p.items).toHaveLength(1);
    expect(p.items[0]).toMatchObject({ kind: "unit", quantity: 300, unitPrice: 900, amount: 270000 });
  });

  it("falls back to the generic process when nothing is recognised", () => {
    const p = templateProposal({ projectName: "Untitled", clientName: null, currency: "EUR", revenue: 10000, targetMargin: 50, items: [] }, labels);
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
