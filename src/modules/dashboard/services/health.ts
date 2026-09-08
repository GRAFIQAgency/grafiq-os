/**
 * Company health per area. No composite score: each area maps a signal that
 * its own module already produced into healthy / attention / risk / unknown.
 * "unknown" means the module is not set up or its read failed — never 0.
 */
import type { CapacityOverview } from "@/modules/capacity/types";
import type { PipelineStats } from "@/modules/sales/types";
import type { QaStats } from "@/modules/qa/types";

import { CAPACITY_ATTENTION_UTILIZATION } from "../constants";
import type { AreaHealth, DashboardFinance, DashboardProjects, Loaded } from "../types";

export interface HealthHrefs {
  sales: string;
  projects: string;
  capacity: string;
  qa: string;
  finance: string;
}

const unknown = (area: AreaHealth["area"], href: string, code = "unavailable"): AreaHealth => ({ area, status: "unknown", code, params: {}, href });

export function salesHealth(loaded: Loaded<PipelineStats>, href: string): AreaHealth {
  if (loaded.state === "error") return unknown("sales", href);
  const s = loaded.data;
  if (!s.openDeals && !s.wonThisMonth && !s.lostThisMonth) return unknown("sales", href, "sales_empty");
  if (s.overdueActions > 0) return { area: "sales", status: "attention", code: "sales_overdue", params: { n: s.overdueActions }, href };
  return { area: "sales", status: "healthy", code: "sales_ok", params: { n: s.openDeals }, href };
}

export function deliveryHealth(loaded: Loaded<DashboardProjects>, href: string): AreaHealth {
  if (loaded.state === "error") return unknown("delivery", href);
  const p = loaded.data;
  if (!p.active) return unknown("delivery", href, "delivery_empty");
  if (p.critical > 0) return { area: "delivery", status: "risk", code: "delivery_critical", params: { n: p.critical }, href };
  if (p.atRisk > 0) return { area: "delivery", status: "attention", code: "delivery_at_risk", params: { n: p.atRisk }, href };
  return { area: "delivery", status: "healthy", code: "delivery_ok", params: { n: p.active }, href };
}

export function capacityHealth(loaded: Loaded<CapacityOverview>, href: string): AreaHealth {
  if (loaded.state === "error") return unknown("capacity", href);
  const c = loaded.data;
  if (c.utilization == null) return unknown("capacity", href, "capacity_unconfigured");
  const percent = Math.round(c.utilization);
  if (c.overloadedPeople > 0) return { area: "capacity", status: "risk", code: "capacity_overloaded", params: { n: c.overloadedPeople, percent }, href };
  if (c.utilization >= CAPACITY_ATTENTION_UTILIZATION) return { area: "capacity", status: "attention", code: "capacity_full", params: { percent }, href };
  return { area: "capacity", status: "healthy", code: "capacity_ok", params: { percent }, href };
}

export function qaHealth(loaded: Loaded<QaStats>, href: string): AreaHealth {
  if (loaded.state === "error") return unknown("qa", href);
  const q = loaded.data;
  if (!q.projectsWithQa) return unknown("qa", href, "qa_empty");
  if (q.needsFixes > 0 || q.overdue > 0) return { area: "qa", status: "risk", code: "qa_problems", params: { n: q.needsFixes + q.overdue }, href };
  if (q.readyForReview > 0) return { area: "qa", status: "attention", code: "qa_review", params: { n: q.readyForReview }, href };
  return { area: "qa", status: "healthy", code: "qa_ok", params: { n: q.approvedThisMonth }, href };
}

export function financeHealth(loaded: Loaded<DashboardFinance>, href: string): AreaHealth {
  if (loaded.state === "error") return unknown("finance", href);
  const f = loaded.data;
  if (!f.hasAccounts) return unknown("finance", href, "finance_unconfigured");
  const risks = f.risks.filter((r) => r.severity === "risk").length;
  if (risks > 0) return { area: "finance", status: "risk", code: "finance_risk", params: { n: risks }, href };
  const warnings = f.risks.length;
  if (warnings > 0) return { area: "finance", status: "attention", code: "finance_warning", params: { n: warnings }, href };
  return { area: "finance", status: "healthy", code: "finance_ok", params: {}, href };
}

export function companyHealth(
  input: { sales: Loaded<PipelineStats>; projects: Loaded<DashboardProjects>; capacity: Loaded<CapacityOverview>; qa: Loaded<QaStats>; finance: Loaded<DashboardFinance> },
  hrefs: HealthHrefs
): AreaHealth[] {
  return [
    deliveryHealth(input.projects, hrefs.projects),
    financeHealth(input.finance, hrefs.finance),
    capacityHealth(input.capacity, hrefs.capacity),
    qaHealth(input.qa, hrefs.qa),
    salesHealth(input.sales, hrefs.sales),
  ];
}
