import { unstable_rethrow } from "next/navigation";

import { getModule } from "@/config/modules";
import { getCapacityOverview } from "@/modules/capacity/queries";
import { getCashForecast, getFinanceOverview, getPortfolioProfitability, listFinanceDateEvents, listProjectProfitability } from "@/modules/finance/queries";
import { listProjectDateEvents, listProjectSummaries, type ProjectSummary } from "@/modules/projects/queries";
import { ACTIVE_STATUSES } from "@/modules/projects/constants";
import { getQaStats, listQaAttentionItems, listQaDateEvents } from "@/modules/qa/queries";
import { getPipelineStats, listSalesAttention, listSalesDateEvents } from "@/modules/sales/queries";
import { listRecentActivity } from "@/modules/sourcing/queries/activity";

import { ACTIVITY_LIMIT, ATTENTION_LIMIT, PROJECT_ATTENTION_LIMIT, SEVERITY_ORDER, TIMELINE_DAYS } from "./constants";
import { capacityAttention, financeAttention, projectAttention, qaAttention, salesAttention, sortAttention, type AttentionHrefs } from "./services/attention";
import { companyHealth } from "./services/health";
import { splitTimeline, toTimeline, type TimelineHrefs } from "./services/timeline";
import type { DashboardData, DashboardFinance, DashboardProjects, DashboardSource, Loaded } from "./types";

/** Every link the Dashboard can produce, built from the module registry. */
export function dashboardHrefs() {
  const projects = getModule("projects").href;
  const finance = getModule("finance").href;
  const qa = getModule("qa").href;
  const sales = getModule("sales").href;
  const capacity = getModule("capacity").href;
  const sourcing = getModule("sourcing").href;
  const talent = getModule("talent").href;
  return {
    projects, finance, qa, sales, capacity, talent,
    project: (id: string) => `${projects}/${id}`,
    projectFinancials: (id: string) => `${projects}/${id}?tab=financials`,
    checklist: (id: string) => `${qa}/checklists/${id}`,
    deal: (id: string) => `${sales}/${id}`,
    capacityPerson: (key: string) => `${capacity}/${key}`,
    receivables: `${finance}/receivables`,
    payables: `${finance}/payables`,
    cashflow: `${finance}/cashflow`,
    profitability: `${finance}/profitability`,
    company: (id: string) => `${sourcing}/companies/${id}`,
    talentPerson: (id: string) => `${sourcing}/talent/${id}`,
  };
}

/**
 * Runs one module read with error isolation: a failing module must never take
 * the whole Dashboard down, and "nothing set up yet" must not look like zero.
 */
async function load<T>(source: string, read: () => Promise<T>, isUnconfigured: (data: T) => boolean = () => false): Promise<Loaded<T>> {
  try {
    const data = await read();
    return { state: isUnconfigured(data) ? "unconfigured" : "ok", data };
  } catch (error) {
    // Never swallow the framework's own control flow (dynamic rendering,
    // redirect, notFound) — only real read failures are isolated.
    unstable_rethrow(error);
    console.error(`[dashboard] ${source} read failed:`, error instanceof Error ? error.message : "unknown error");
    return { state: "error", data: null };
  }
}

const isDelivery = (status: string) => (ACTIVE_STATUSES as readonly string[]).includes(status);
const HEALTH_RANK: Record<string, number> = { critical: 0, at_risk: 1, attention: 2, healthy: 3 };

function toProjectsView(summaries: ProjectSummary[], today: string, weekEnd: string): DashboardProjects {
  const active = summaries.filter((p) => isDelivery(p.status));
  const month = today.slice(0, 7);
  const attention = active
    .filter((p) => p.health !== "healthy")
    .sort((a, b) => HEALTH_RANK[a.health] - HEALTH_RANK[b.health] || (a.deadline ?? "9999-12-31").localeCompare(b.deadline ?? "9999-12-31"))
    .slice(0, PROJECT_ATTENTION_LIMIT);
  return {
    summaries,
    active: active.length,
    atRisk: active.filter((p) => p.health === "at_risk" || p.health === "critical").length,
    critical: active.filter((p) => p.health === "critical").length,
    dueThisWeek: active.filter((p) => p.deadline && p.deadline >= today && p.deadline <= weekEnd).length,
    waitingClient: summaries.filter((p) => p.status === "waiting_client").length,
    internalReview: summaries.filter((p) => p.status === "internal_review").length,
    completedThisMonth: summaries.filter((p) => p.status === "completed" && p.completedAt?.startsWith(month)).length,
    attention,
  };
}

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}

/**
 * One parallel pass over every module read API. Nothing here computes domain
 * numbers: margins come from Projects/Finance, utilization from Capacity, QA
 * state from QA, cash from Finance.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = addDays(today, TIMELINE_DAYS);
  const hrefs = dashboardHrefs();

  const [projectsLoaded, salesLoaded, capacityLoaded, qaLoaded, financeLoaded, activityLoaded, qaItems, salesItems, events] = await Promise.all([
    load("projects", async () => toProjectsView(await listProjectSummaries(), today, weekEnd), (p) => p.summaries.length === 0),
    load("sales", getPipelineStats, (s) => !s.openDeals && !s.wonThisMonth && !s.lostThisMonth && Object.values(s.byStage).every((n) => n === 0)),
    load("capacity", getCapacityOverview, (c) => c.utilization == null),
    load("qa", getQaStats, (q) => q.projectsWithQa === 0),
    load("finance", async (): Promise<DashboardFinance> => {
      const [overview, forecast, profitability] = await Promise.all([getFinanceOverview(), getCashForecast(3), listProjectProfitability()]);
      const inDelivery = profitability.filter((p) => isDelivery(p.status));
      return {
        currencies: overview.currencies, risks: overview.risks, hasAccounts: overview.hasAccounts, forecast,
        portfolio: await getPortfolioProfitability("forecast", inDelivery),
        lowMargin: inDelivery
          .filter((p) => p.marginHealth === "at_risk" || p.marginHealth === "critical")
          .sort((a, b) => (a.financials.forecast.grossMargin ?? 0) - (b.financials.forecast.grossMargin ?? 0))
          .slice(0, 5)
          .map((p) => ({ projectId: p.projectId, name: p.name, clientName: p.clientName, currency: p.currency, margin: p.financials.forecast.grossMargin, health: p.marginHealth })),
      };
    }, (f) => !f.hasAccounts),
    load("activity", () => listRecentActivity(ACTIVITY_LIMIT)),
    load("qa-attention", listQaAttentionItems),
    load("sales-attention", listSalesAttention),
    load("timeline", async () => {
      const [projects, qa, sales, finance] = await Promise.all([
        listProjectDateEvents(today, weekEnd).catch(() => []),
        listQaDateEvents(today, weekEnd).catch(() => []),
        listSalesDateEvents(addDays(today, -30), weekEnd).catch(() => []),
        listFinanceDateEvents(addDays(today, -30), weekEnd).catch(() => []),
      ]);
      return { projects, qa, sales, finance };
    }),
  ]);

  const attentionHrefs: AttentionHrefs = { project: hrefs.project, capacityPerson: hrefs.capacityPerson, capacity: hrefs.capacity, checklist: hrefs.checklist, deal: hrefs.deal };
  const timelineHrefs: TimelineHrefs = { project: hrefs.project, checklist: hrefs.checklist, deal: hrefs.deal, receivables: hrefs.receivables, payables: hrefs.payables };

  const attention = sortAttention([
    ...(financeLoaded.data ? financeAttention(financeLoaded.data.risks, hrefs.finance) : []),
    ...(projectsLoaded.data ? projectAttention(projectsLoaded.data.summaries.filter((p) => isDelivery(p.status)), attentionHrefs) : []),
    ...capacityAttention(capacityLoaded.data, attentionHrefs),
    ...(qaItems.data ? qaAttention(qaItems.data, attentionHrefs) : []),
    ...(salesItems.data ? salesAttention(salesItems.data, attentionHrefs) : []),
  ]).slice(0, ATTENTION_LIMIT);

  const timeline = events.data
    ? splitTimeline(toTimeline(events.data, today, timelineHrefs), today)
    : { today: [], week: [] };

  const failed: DashboardSource[] = ([
    ["projects", projectsLoaded], ["sales", salesLoaded], ["capacity", capacityLoaded], ["qa", qaLoaded], ["finance", financeLoaded],
  ] as const).filter(([, l]) => l.state === "error").map(([s]) => s);

  return {
    today,
    projects: projectsLoaded,
    sales: salesLoaded,
    salesAttentionCount: salesItems.data?.length ?? 0,
    capacity: capacityLoaded,
    qa: qaLoaded,
    qaItems: qaItems.data ?? [],
    finance: financeLoaded,
    activity: activityLoaded,
    attention,
    timeline,
    health: companyHealth(
      { sales: salesLoaded, projects: projectsLoaded, capacity: capacityLoaded, qa: qaLoaded, finance: financeLoaded },
      { sales: hrefs.sales, projects: hrefs.projects, capacity: hrefs.capacity, qa: hrefs.qa, finance: hrefs.finance }
    ),
    failed,
  };
}

export { SEVERITY_ORDER };
