/**
 * Project economics. Pure and tested.
 *
 * BASELINE  = what we sold (frozen at project creation).
 * CURRENT   = where we are now: actual labour + actual fixed costs,
 *             against current revenue (baseline + approved change requests).
 * FORECAST  = where we will land: forecast labour + fixed costs
 *             + approved change-request costs. Falls back to the baseline when nothing is planned yet.
 *
 * Labour depends on the member's PAY MODEL on this project:
 *   hourly  → hours × cost-rate SNAPSHOT (actual: logged hours; forecast: max(actual, planned, estimated))
 *   fixed   → the agreed fixed cost for the whole project (forecast always; current once work has
 *             started, i.e. hours were logged or the member is completed)
 *   percent → percent of CURRENT revenue (same timing rule as fixed)
 * Hours logged by fixed / percent members are covered by the fee, so they are never "unpriced".
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
  members: Pick<ProjectMember, "id" | "status" | "plannedHours" | "costRate" | "payModel" | "fixedCost" | "percent">[];
  tasks: Pick<Task, "assigneeMemberId" | "estimatedHours" | "actualHours">[];
  costs: Pick<DirectCost, "estimatedCost" | "actualCost">[];
  changeRequests: Pick<ChangeRequest, "status" | "additionalRevenue" | "additionalDirectCost">[];
}

type Member = FinancialInputs["members"][number];
type TaskLike = FinancialInputs["tasks"][number];

/** Fee of a fixed / percent member; null for hourly members. */
export function memberFee(m: Member, currentRevenue: number): number | null {
  if (m.payModel === "fixed") return m.fixedCost ?? 0;
  if (m.payModel === "percent") return (currentRevenue * (m.percent ?? 0)) / 100;
  return null;
}

const hoursOf = (tasks: TaskLike[], memberId: string, key: "actualHours" | "estimatedHours") =>
  tasks.filter((t) => t.assigneeMemberId === memberId).reduce((s, t) => s + (t[key] ?? 0), 0);

/**
 * actual labour = Σ hourly members: task.actualHours × rate snapshot
 *               + Σ fixed / percent members whose work has started: their fee.
 * Hours of hourly members without a rate are reported as unpriced.
 */
export function actualLabourCost(members: Member[], tasks: TaskLike[], currentRevenue = 0): { cost: number; unpricedHours: number } {
  let cost = 0;
  let unpricedHours = 0;
  const byId = new Map(members.map((m) => [m.id, m]));
  for (const t of tasks) {
    const hours = t.actualHours ?? 0;
    if (!hours) continue;
    const m = t.assigneeMemberId ? byId.get(t.assigneeMemberId) : undefined;
    if (!m) {
      unpricedHours += hours;
      continue;
    }
    if (m.payModel !== "hourly") continue; // covered by the fee below
    if (m.costRate == null) unpricedHours += hours;
    else cost += hours * m.costRate;
  }
  for (const m of members) {
    const fee = memberFee(m, currentRevenue);
    if (fee == null || m.status === "removed") continue;
    const started = m.status === "completed" || hoursOf(tasks, m.id, "actualHours") > 0;
    if (started) cost += fee;
  }
  return { cost, unpricedHours };
}

/**
 * forecast labour = Σ hourly members: max(actual, planned ?? estimated, estimated) × rate
 *                 + Σ fixed / percent members (not removed): their fee.
 */
export function forecastLabourCost(members: Member[], tasks: TaskLike[], currentRevenue = 0): number {
  let total = 0;
  for (const m of members) {
    if (m.status === "removed") continue;
    const fee = memberFee(m, currentRevenue);
    if (fee != null) {
      total += fee;
      continue;
    }
    if (m.costRate == null) continue;
    const actual = hoursOf(tasks, m.id, "actualHours");
    const estimated = hoursOf(tasks, m.id, "estimatedHours");
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

  const labour = actualLabourCost(members, tasks, currentRevenue);
  const actualFixedCost = costs.reduce((s, c) => s + (c.actualCost ?? 0), 0);
  const currentDirectCost = labour.cost + actualFixedCost;
  const estimatedHours = tasks.reduce((s, t) => s + (t.estimatedHours ?? 0), 0);
  const actualHours = tasks.reduce((s, t) => s + (t.actualHours ?? 0), 0);

  const forecastLabour = forecastLabourCost(members, tasks, currentRevenue);
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
