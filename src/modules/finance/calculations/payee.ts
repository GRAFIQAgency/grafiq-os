/**
 * "Create payable" prefill from a project member. The amount comes ONLY from
 * the member's pay-model SNAPSHOT on the project (rate, fixed fee, percent,
 * unit cost) — never from today's Talent settings. Same rule as Projects'
 * financials, reused from there.
 */
import { memberCurrentFee } from "@/modules/projects/calculations/financials";
import type { ProjectMember, Task } from "@/modules/projects/types";

type MemberLike = Pick<ProjectMember, "id" | "status" | "plannedHours" | "costRate" | "payModel" | "fixedCost" | "percent" | "unitCost" | "plannedUnits" | "deliveredUnits" | "currency">;
type TaskLike = Pick<Task, "assigneeMemberId" | "estimatedHours" | "actualHours">;

export interface PayableSuggestion {
  amount: number;
  basis: "hours_actual" | "hours_planned" | "fixed" | "percent" | "unit";
  /** Numbers behind the amount, for the UI hint. */
  hours: number | null;
  rate: number | null;
  units: number | null;
}

export function suggestPayableAmount(m: MemberLike, tasks: readonly TaskLike[], currentRevenue: number): PayableSuggestion {
  if (m.payModel === "hourly") {
    const mine = tasks.filter((t) => t.assigneeMemberId === m.id);
    const actual = mine.reduce((s, t) => s + (t.actualHours ?? 0), 0);
    const estimated = mine.reduce((s, t) => s + (t.estimatedHours ?? 0), 0);
    const planned = m.plannedHours ?? estimated;
    const hours = actual > 0 ? actual : planned;
    const rate = m.costRate ?? 0;
    return { amount: Math.round(hours * rate * 100) / 100, basis: actual > 0 ? "hours_actual" : "hours_planned", hours, rate, units: null };
  }
  const fee = memberCurrentFee(m, currentRevenue, true) ?? 0;
  if (m.payModel === "unit") return { amount: fee, basis: "unit", hours: null, rate: m.unitCost, units: m.deliveredUnits };
  return { amount: Math.round(fee * 100) / 100, basis: m.payModel === "fixed" ? "fixed" : "percent", hours: null, rate: m.payModel === "percent" ? m.percent : null, units: null };
}
