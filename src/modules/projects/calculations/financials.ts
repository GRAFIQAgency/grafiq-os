/**
 * Project economics. Pure and tested.
 *
 * BASELINE  = what we sold (frozen at project creation).
 * CURRENT   = where we are now: actual labour (task hours × member rate SNAPSHOT) + actual fixed costs,
 *             against current revenue (baseline + approved change requests).
 * FORECAST  = where we will land: max(actual, planned/estimated) labour + fixed costs
 *             + approved change-request costs. Falls back to the baseline when nothing is planned yet.
 */
import type { ChangeRequest, DirectCost, MoneyBlock, Project, ProjectFinancials, ProjectMember, Task } from "../types";

export function grossMargin(revenue: number, directCost: number): number | null {
  return revenue > 0 ? ((revenue - directCost) / revenue) * 100 : null;
}

export function moneyBlock(revenue: number, directCost: number): MoneyBlock {
  return { revenue, directCost, grossProfit: revenue - directCost, grossMargin: grossMargin(revenue, directCost) };
}

export interface FinancialInputs {
  project: Pick<Project, "currency" | "baselineRevenue" | "baselineDirectCost">;
  members: Pick<ProjectMember, "id" | "status" | "plannedHours" | "costRate">[];
  tasks: Pick<Task, "assigneeMemberId" | "estimatedHours" | "actualHours">[];
  costs: Pick<DirectCost, "estimatedCost" | "actualCost">[];
  changeRequests: Pick<ChangeRequest, "status" | "additionalRevenue" | "additionalDirectCost">[];
}

/** actual labour = Σ task.actualHours × assignee cost-rate snapshot. */
export function actualLabourCost(members: FinancialInputs["members"], tasks: FinancialInputs["tasks"]): { cost: number; unpricedHours: number } {
  const rateById = new Map(members.map((m) => [m.id, m.costRate]));
  let cost = 0;
  let unpricedHours = 0;
  for (const t of tasks) {
    const hours = t.actualHours ?? 0;
    if (!hours) continue;
    const rate = t.assigneeMemberId ? rateById.get(t.assigneeMemberId) : null;
    if (rate == null) unpricedHours += hours;
    else cost += hours * rate;
  }
  return { cost, unpricedHours };
}

/** forecast labour = Σ per member max(actual hours, planned hours ?? estimated task hours) × rate snapshot. */
export function forecastLabourCost(members: FinancialInputs["members"], tasks: FinancialInputs["tasks"]): number {
  let total = 0;
  for (const m of members) {
    if (m.status === "removed" || m.costRate == null) continue;
    const mine = tasks.filter((t) => t.assigneeMemberId === m.id);
    const actual = mine.reduce((s, t) => s + (t.actualHours ?? 0), 0);
    const estimated = mine.reduce((s, t) => s + (t.estimatedHours ?? 0), 0);
    const planned = m.plannedHours ?? (estimated || 0);
    total += Math.max(actual, planned, estimated) * m.costRate;
  }
  return total;
}

export function computeFinancials(input: FinancialInputs): ProjectFinancials {
  const { project, members, tasks, costs, changeRequests } = input;

  const approved = changeRequests.filter((c) => c.status === "approved");
  const approvedChanges = {
    count: approved.length,
    revenue: approved.reduce((s, c) => s + c.additionalRevenue, 0),
    directCost: approved.reduce((s, c) => s + c.additionalDirectCost, 0),
  };

  const baseline = moneyBlock(project.baselineRevenue, project.baselineDirectCost);
  const currentRevenue = project.baselineRevenue + approvedChanges.revenue;

  const labour = actualLabourCost(members, tasks);
  const actualFixedCost = costs.reduce((s, c) => s + (c.actualCost ?? 0), 0);
  const currentDirectCost = labour.cost + actualFixedCost;
  const estimatedHours = tasks.reduce((s, t) => s + (t.estimatedHours ?? 0), 0);
  const actualHours = tasks.reduce((s, t) => s + (t.actualHours ?? 0), 0);

  const forecastLabour = forecastLabourCost(members, tasks);
  const forecastFixed = costs.reduce((s, c) => s + Math.max(c.estimatedCost, c.actualCost ?? 0), 0);
  const hasActivity = forecastLabour > 0 || forecastFixed > 0 || labour.cost > 0;
  const forecastDirect = hasActivity ? forecastLabour + forecastFixed + approvedChanges.directCost : project.baselineDirectCost + approvedChanges.directCost;

  return {
    currency: project.currency,
    baseline,
    approvedChanges,
    current: {
      ...moneyBlock(currentRevenue, currentDirectCost),
      actualLabourCost: labour.cost,
      actualFixedCost,
      estimatedHours,
      actualHours,
      unpricedHours: labour.unpricedHours,
    },
    forecast: {
      ...moneyBlock(currentRevenue, forecastDirect),
      labourCost: forecastLabour,
      fixedCost: forecastFixed,
      basis: hasActivity ? "activity" : "baseline",
    },
  };
}
