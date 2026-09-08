/**
 * Portfolio profitability. The per-project numbers come from Projects
 * (`computeFinancials`) — Finance never recalculates project economics; it
 * only adds them up per currency.
 */
import type { ProjectHealth } from "@/modules/projects/types";
import type { MarginThresholds } from "@/modules/settings/types";
import type { Currency } from "@/types/database";

import type { PortfolioTotals, ProfitabilityFilters, ProjectProfitability } from "../types";
import { round2 } from "./dates";

export type ProfitabilityView = "baseline" | "current" | "forecast";

const CLOSED: readonly string[] = ["completed", "cancelled", "archived"];
const IN_DELIVERY: readonly string[] = ["onboarding", "active", "waiting_client", "internal_review"];

/** Margin health from Settings thresholds (same bands Projects use for margin reasons). */
export function marginHealth(margin: number | null, t: MarginThresholds): ProjectHealth {
  if (margin == null) return "healthy";
  if (margin < t.minimum) return "critical";
  if (margin < t.warning) return "at_risk";
  if (margin < t.target) return "attention";
  return "healthy";
}

/**
 * Totals per currency. Weighted margin = Σ gross profit / Σ revenue.
 * NEVER average(project margins) and NEVER add currencies together.
 */
export function portfolioTotals(items: readonly Pick<ProjectProfitability, "currency" | "financials">[], view: ProfitabilityView, order: readonly Currency[]): PortfolioTotals[] {
  const out: PortfolioTotals[] = [];
  for (const currency of order) {
    const mine = items.filter((i) => i.currency === currency);
    if (!mine.length) continue;
    const revenue = round2(mine.reduce((s, i) => s + i.financials[view].revenue, 0));
    const directCost = round2(mine.reduce((s, i) => s + i.financials[view].directCost, 0));
    const grossProfit = round2(revenue - directCost);
    out.push({ currency, projects: mine.length, revenue, directCost, grossProfit, grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : null });
  }
  return out;
}

const lc = (s: string | null | undefined) => (s ?? "").toLowerCase();

export function matchesProfitabilityFilters(p: ProjectProfitability, f: ProfitabilityFilters): boolean {
  if (f.q && !f.q.toLowerCase().split(/\s+/).every((w) => `${lc(p.name)} ${lc(p.clientName)}`.includes(w))) return false;
  if (f.status && p.status !== f.status) return false;
  if (f.clientId && p.clientId !== f.clientId) return false;
  if (f.projectType && p.projectType !== f.projectType) return false;
  if (f.currency && p.currency !== f.currency) return false;
  if (f.health && p.marginHealth !== f.health) return false;
  const scope = f.scope ?? "active";
  if (scope === "active" && (CLOSED.includes(p.status) || p.status === "draft" || p.status === "on_hold")) return false;
  if (scope === "completed" && p.status !== "completed") return false;
  return true;
}

export function isInDelivery(status: string): boolean {
  return IN_DELIVERY.includes(status);
}
