import type { CompanyCrmDetailsRow, Currency } from "@/types/database";
import type { CompanyLead } from "@/modules/sourcing/types";

import { CLOSED_STAGES, CRM_STAGES, STAGE_PROBABILITY } from "../constants";
import type { CrmStage, CustomerRecord, Deal, DealDetails, DealFilters, DealSort, PipelineStats } from "../types";

/** Pure pipeline rules. No React, no Supabase — tested in pipeline.test.ts. */

const DAY_MS = 86_400_000;

export function rowToDetails(r: CompanyCrmDetailsRow): DealDetails {
  return {
    companyId: r.company_id, ownerId: r.owner_id, dealValue: r.deal_value == null ? null : Number(r.deal_value), dealCurrency: r.deal_currency,
    probability: r.probability, expectedClose: r.expected_close, nextStep: r.next_step, nextActionAt: r.next_action_at,
    lostReason: r.lost_reason, pricingEstimateId: r.pricing_estimate_id, wonAt: r.won_at, lostAt: r.lost_at, updatedAt: r.updated_at,
  };
}

export function emptyDetails(companyId: string): DealDetails {
  return {
    companyId, ownerId: null, dealValue: null, dealCurrency: null, probability: null, expectedClose: null, nextStep: null,
    nextActionAt: null, lostReason: null, pricingEstimateId: null, wonAt: null, lostAt: null, updatedAt: null,
  };
}

export function isClosed(stage: CrmStage): boolean {
  return CLOSED_STAGES.includes(stage);
}

export function defaultProbability(stage: CrmStage): number {
  return STAGE_PROBABILITY[stage];
}

/** Effective probability: an explicit value wins on open stages; closed stages are always 100 / 0. */
export function effectiveProbability(stage: CrmStage, custom: number | null): number {
  if (isClosed(stage)) return defaultProbability(stage);
  return custom ?? defaultProbability(stage);
}

/** Compares date-only strings (YYYY-MM-DD) against "today" in the same format. */
export function isOverdue(dateOnly: string | null, today: Date): boolean {
  if (!dateOnly) return false;
  return dateOnly < today.toISOString().slice(0, 10);
}

export function toDeal(
  company: CompanyLead,
  details: DealDetails | null,
  names: { ownerName?: string | null; estimateName?: string | null },
  today: Date
): Deal {
  const stage: CrmStage = company.crmStatus ?? "prospect";
  const d = details ?? emptyDetails(company.id);
  const probability = effectiveProbability(stage, d.probability);
  const open = !isClosed(stage);
  const since = company.crmAddedAt ? new Date(company.crmAddedAt).getTime() : new Date(company.createdAt).getTime();
  return {
    company, details: d, stage,
    ownerName: names.ownerName ?? null,
    estimateName: names.estimateName ?? null,
    probability,
    probabilityIsCustom: open && d.probability != null,
    weightedValue: d.dealValue == null ? null : Math.round(d.dealValue * probability) / 100,
    nextActionOverdue: open && isOverdue(d.nextActionAt, today),
    isOpen: open,
    ageDays: Math.max(0, Math.floor((today.getTime() - since) / DAY_MS)),
  };
}

/**
 * Details patch for a stage change. Won / lost stamp their timestamps; moving a
 * closed deal back to an open stage clears them so history stays truthful.
 */
export function stageTransition(stage: CrmStage, lostReason: string | null, now: Date): Partial<Pick<CompanyCrmDetailsRow, "won_at" | "lost_at" | "lost_reason">> {
  const iso = now.toISOString();
  if (stage === "customer") return { won_at: iso, lost_at: null, lost_reason: null };
  if (stage === "lost") return { lost_at: iso, won_at: null, lost_reason: lostReason };
  return { won_at: null, lost_at: null, lost_reason: null };
}

export function matchesFilters(deal: Deal, f: DealFilters): boolean {
  const c = deal.company;
  if (!f.includeClosed && !f.stage && !deal.isOpen) return false;
  if (f.stage && deal.stage !== f.stage) return false;
  if (f.ownerId && deal.details.ownerId !== f.ownerId) return false;
  if (f.overdueOnly && !deal.nextActionOverdue) return false;
  if (f.country && !(c.country ?? "").toLowerCase().includes(f.country.toLowerCase())) return false;
  if (f.industry && !(c.industry ?? "").toLowerCase().includes(f.industry.toLowerCase())) return false;
  if (f.q) {
    const hay = [c.name, c.domain, c.industry, c.city, c.country, deal.details.nextStep, deal.ownerName, ...c.tags].filter(Boolean).join(" ").toLowerCase();
    if (!f.q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w))) return false;
  }
  return true;
}

const stageRank = (s: CrmStage) => CRM_STAGES.indexOf(s);
const nullsLast = (a: number | string | null, b: number | string | null, dir: 1 | -1 = 1) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return (a < b ? -1 : a > b ? 1 : 0) * dir;
};

export function sortDeals(deals: Deal[], sort: DealSort): Deal[] {
  const byName = (a: Deal, b: Deal) => a.company.name.localeCompare(b.company.name);
  const list = [...deals];
  switch (sort) {
    case "next_action":
      // Overdue first, then nearest next action, then no next action; open before closed.
      return list.sort((a, b) => Number(b.isOpen) - Number(a.isOpen) || Number(b.nextActionOverdue) - Number(a.nextActionOverdue) || nullsLast(a.details.nextActionAt, b.details.nextActionAt) || stageRank(b.stage) - stageRank(a.stage) || byName(a, b));
    case "value":
      return list.sort((a, b) => nullsLast(a.details.dealValue, b.details.dealValue, -1) || byName(a, b));
    case "weighted":
      return list.sort((a, b) => nullsLast(a.weightedValue, b.weightedValue, -1) || byName(a, b));
    case "expected_close":
      return list.sort((a, b) => nullsLast(a.details.expectedClose, b.details.expectedClose) || byName(a, b));
    case "score":
      return list.sort((a, b) => nullsLast(a.company.manualScore ?? a.company.leadScore, b.company.manualScore ?? b.company.leadScore, -1) || byName(a, b));
    case "recent":
      return list.sort((a, b) => (b.company.crmAddedAt ?? b.company.createdAt).localeCompare(a.company.crmAddedAt ?? a.company.createdAt));
    case "name":
    default:
      return list.sort(byName);
  }
}

function addTo(map: Partial<Record<Currency, number>>, currency: Currency | null, value: number | null) {
  if (currency == null || value == null) return;
  map[currency] = (map[currency] ?? 0) + value;
}

export function pipelineStats(deals: Deal[], today: Date): PipelineStats {
  const month = today.toISOString().slice(0, 7);
  const byStage = Object.fromEntries(CRM_STAGES.map((s) => [s, 0])) as Record<CrmStage, number>;
  const stats: PipelineStats = { openDeals: 0, openValue: {}, weightedValue: {}, overdueActions: 0, wonThisMonth: 0, lostThisMonth: 0, byStage };
  for (const d of deals) {
    byStage[d.stage] += 1;
    if (d.isOpen) {
      stats.openDeals += 1;
      addTo(stats.openValue, d.details.dealCurrency, d.details.dealValue);
      addTo(stats.weightedValue, d.details.dealCurrency, d.weightedValue);
      if (d.nextActionOverdue) stats.overdueActions += 1;
    }
    if (d.stage === "customer" && d.details.wonAt?.startsWith(month)) stats.wonThisMonth += 1;
    if (d.stage === "lost" && d.details.lostAt?.startsWith(month)) stats.lostThisMonth += 1;
  }
  return stats;
}

export function toCustomerRecord(deal: Deal): CustomerRecord {
  const c = deal.company;
  return {
    id: c.id, name: c.name, domain: c.domain, country: c.country, industry: c.industry, stage: deal.stage,
    ownerId: deal.details.ownerId, dealValue: deal.details.dealValue, dealCurrency: deal.details.dealCurrency, wonAt: deal.details.wonAt,
  };
}
