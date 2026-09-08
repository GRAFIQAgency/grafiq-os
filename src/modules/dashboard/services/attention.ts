/**
 * Normalizes the signals the modules already produce into one attention feed.
 * Pure and deterministic: no AI, no new domain maths, no dictionaries.
 */
import type { CapacityOverview } from "@/modules/capacity/types";
import type { FinanceRisk } from "@/modules/finance/types";
import type { ProjectSummary } from "@/modules/projects/queries";
import type { SalesAttentionItem } from "@/modules/sales/queries";
import type { QaAttentionItem } from "@/modules/qa/types";

import { CRITICAL_FINANCE_CODES, CRITICAL_UTILIZATION, SALES_OVERDUE_HIGH_DAYS, SEVERITY_ORDER, SOURCE_ORDER } from "../constants";
import type { DashboardAttentionItem, DashboardSeverity } from "../types";

export interface AttentionHrefs {
  project: (id: string) => string;
  capacityPerson: (key: string) => string;
  capacity: string;
  checklist: (id: string) => string;
  deal: (id: string) => string;
}

/** Project health (from `computeHealth`) mapped to feed severity. */
const PROJECT_SEVERITY: Record<string, DashboardSeverity | null> = {
  critical: "critical",
  at_risk: "high",
  attention: "attention",
  healthy: null,
};

export function projectAttention(projects: readonly ProjectSummary[], hrefs: AttentionHrefs): DashboardAttentionItem[] {
  const out: DashboardAttentionItem[] = [];
  for (const p of projects) {
    const severity = PROJECT_SEVERITY[p.health];
    if (!severity || !p.healthReasons.length) continue;
    out.push({
      id: `project:${p.id}`, source: "projects", severity, textSource: "dashboard", code: "project_health",
      params: { project: p.name, client: p.clientName ?? "—" },
      reasons: p.healthReasons.map((r) => ({ code: r.code, params: r.params })), reasonSource: "projects",
      href: hrefs.project(p.id), date: p.deadline,
      value: { amount: p.currentRevenue, currency: p.currency }, currency: p.currency,
    });
  }
  return out;
}

export function capacityAttention(overview: CapacityOverview | null, hrefs: AttentionHrefs): DashboardAttentionItem[] {
  if (!overview) return [];
  const out: DashboardAttentionItem[] = overview.overloaded.map((p) => ({
    id: `capacity:${p.personKey}`, source: "capacity",
    severity: (p.utilization ?? 0) >= CRITICAL_UTILIZATION ? "critical" : "high",
    textSource: "dashboard", code: "capacity_overload",
    params: { name: p.name, hours: Math.round(p.overBy), percent: p.utilization == null ? "—" : Math.round(p.utilization) },
    reasons: [], href: hrefs.capacityPerson(p.personKey), date: null, value: null, currency: null,
  }));
  if (overview.unscheduledHours > 0) {
    out.push({
      id: "capacity:unscheduled", source: "capacity", severity: "info", textSource: "dashboard", code: "capacity_unscheduled",
      params: { hours: Math.round(overview.unscheduledHours) }, reasons: [], href: hrefs.capacity, date: null, value: null, currency: null,
    });
  }
  if (overview.unconfiguredPeople > 0) {
    out.push({
      id: "capacity:unconfigured", source: "capacity", severity: "info", textSource: "dashboard", code: "capacity_unconfigured",
      params: { n: overview.unconfiguredPeople }, reasons: [], href: hrefs.capacity, date: null, value: null, currency: null,
    });
  }
  return out;
}

const QA_SEVERITY: Record<QaAttentionItem["reason"], DashboardSeverity> = {
  failed: "high",
  blocked: "high",
  overdue: "high",
  ready_for_review: "info",
};

export function qaAttention(items: readonly QaAttentionItem[], hrefs: AttentionHrefs): DashboardAttentionItem[] {
  return items.map((i) => ({
    id: `qa:${i.checklistId}:${i.reason}`, source: "qa", severity: QA_SEVERITY[i.reason], textSource: "dashboard",
    code: `qa_${i.reason}`, params: { project: i.projectName, title: i.title, n: i.count },
    reasons: [], href: hrefs.checklist(i.checklistId), date: i.dueDate, value: null, currency: null,
  }));
}

export function salesAttention(items: readonly SalesAttentionItem[], hrefs: AttentionHrefs): DashboardAttentionItem[] {
  return items.map((i) => ({
    id: `sales:${i.companyId}:${i.reason}`, source: "sales",
    severity: i.reason === "overdue_action" ? (i.daysOverdue >= SALES_OVERDUE_HIGH_DAYS ? "high" : "attention") : "info",
    textSource: "dashboard", code: `sales_${i.reason}`,
    params: { name: i.name, days: i.daysOverdue, age: i.ageDays, step: i.nextStep ?? "—" },
    reasons: [], href: hrefs.deal(i.companyId), date: i.nextActionAt,
    value: i.value != null && i.currency ? { amount: i.value, currency: i.currency } : null, currency: i.currency,
  }));
}

/** Finance risks keep their own explained sentence (dict.finance.risks.<code>). */
export function financeAttention(risks: readonly FinanceRisk[], fallbackHref: string): DashboardAttentionItem[] {
  return risks.map((r, index) => ({
    id: `finance:${r.code}:${r.currency ?? "all"}:${index}`, source: "finance",
    severity: r.severity === "risk" ? (CRITICAL_FINANCE_CODES.includes(r.code) ? "critical" : "high") : "attention",
    textSource: "finance", code: r.code, params: r.params, reasons: [],
    href: r.href ?? fallbackHref, date: typeof r.params.date === "string" ? r.params.date : null, value: null, currency: r.currency,
  }));
}

/**
 * Deterministic ranking: severity, then the source order (money → delivery →
 * people → quality → sales), then the nearest date, then the largest amount.
 */
export function sortAttention(items: readonly DashboardAttentionItem[]): DashboardAttentionItem[] {
  return [...items].sort((a, b) => {
    const s = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
    if (s !== 0) return s;
    const src = SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source);
    if (src !== 0) return src;
    const da = a.date ?? "9999-12-31";
    const db = b.date ?? "9999-12-31";
    if (da !== db) return da.localeCompare(db);
    return (b.value?.amount ?? 0) - (a.value?.amount ?? 0);
  });
}

export function countBySeverity(items: readonly DashboardAttentionItem[]): Record<DashboardSeverity, number> {
  const out = { critical: 0, high: 0, attention: 0, info: 0 };
  for (const i of items) out[i.severity] += 1;
  return out;
}
