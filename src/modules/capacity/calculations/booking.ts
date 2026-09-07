import { CAPACITY_PROJECT_STATUSES } from "../constants";
import type { Allocation, Period, ProjectAssignment, UnscheduledHours } from "../types";
import { distributeHours } from "./periods";

/**
 * Booked hours — derived from Projects, never stored.
 *
 * For every project member assignment (only projects in CAPACITY_PROJECT_STATUSES,
 * members not removed):
 *
 *   taskHours     = Σ estimated hours of tasks assigned to the member
 *   planned       = member.plannedHours (an assignment budget, may be null)
 *   workload      = max(planned ?? 0, taskHours)
 *   remainder     = workload − taskHours   (planned hours not yet broken into tasks)
 *
 * So task hours and planned hours are never added: tasks are the precise part,
 * the remainder is the still-unscheduled part of the budget. Pay model
 * (hourly / fixed / percent) plays no role — capacity is time.
 *
 * Placement in time, best available dates first:
 *   task      → task start / due date, falling back to the assignment range,
 *               then the project range (start / deadline); a single known date
 *               is used as a one-day range
 *   remainder → assignment start / end, then project start / deadline
 * Hours are split proportionally across working days (see distributeHours).
 * Hours with no dates at any level are reported as UNSCHEDULED, not invented.
 */

export interface DateRange {
  start: string;
  end: string;
}

/** Resolves a range from optional start/end with fallbacks; null when nothing is known. */
export function resolveRange(start: string | null, end: string | null, ...fallbacks: (DateRange | null)[]): DateRange | null {
  if (start && end) return { start, end };
  const fb = fallbacks.find((f): f is DateRange => f != null) ?? null;
  if (start) return { start, end: fb && fb.end >= start ? fb.end : start };
  if (end) return { start: fb && fb.start <= end ? fb.start : end, end };
  return fb;
}

export function assignmentRange(a: ProjectAssignment): DateRange | null {
  return resolveRange(a.startsOn, a.endsOn, projectRange(a));
}

export function projectRange(a: ProjectAssignment): DateRange | null {
  return resolveRange(a.projectStartDate, a.projectDeadline);
}

export function countsForCapacity(a: ProjectAssignment): boolean {
  return CAPACITY_PROJECT_STATUSES.includes(a.projectStatus) && a.memberStatus !== "removed";
}

/** Planned workload of an assignment: max(planned hours, task estimates). */
export function assignmentWorkload(a: ProjectAssignment): { taskHours: number; planned: number | null; workload: number; remainder: number } {
  const taskHours = a.tasks.reduce((s, t) => s + (t.estimatedHours ?? 0), 0);
  const planned = a.plannedHours;
  const workload = Math.max(planned ?? 0, taskHours);
  return { taskHours, planned, workload, remainder: Math.max(0, workload - taskHours) };
}

export interface AssignmentAllocation {
  allocations: Allocation[];
  unscheduled: UnscheduledHours[];
}

/** Places one assignment's hours into a period. */
export function allocateAssignment(a: ProjectAssignment, personKey: string, period: Period): AssignmentAllocation {
  const allocations: Allocation[] = [];
  const unscheduled: UnscheduledHours[] = [];
  if (!countsForCapacity(a)) return { allocations, unscheduled };

  const aRange = assignmentRange(a);
  const pRange = projectRange(a);
  const { remainder } = assignmentWorkload(a);
  const base = { projectId: a.projectId, projectName: a.projectName, memberId: a.memberId, personKey };

  for (const t of a.tasks) {
    const hours = t.estimatedHours ?? 0;
    if (hours <= 0) continue;
    const range = resolveRange(t.startDate, t.dueDate, aRange, pRange);
    if (!range) {
      unscheduled.push({ ...base, label: t.title, hours });
      continue;
    }
    const inPeriod = distributeHours(hours, range.start, range.end, period);
    if (inPeriod > 0) allocations.push({ ...base, source: "task", taskId: t.id, label: t.title, hours: inPeriod, totalHours: hours, rangeStart: range.start, rangeEnd: range.end });
  }

  if (remainder > 0) {
    const range = aRange ?? pRange;
    if (!range) {
      unscheduled.push({ ...base, label: a.projectRole, hours: remainder });
    } else {
      const inPeriod = distributeHours(remainder, range.start, range.end, period);
      if (inPeriod > 0) allocations.push({ ...base, source: "remainder", taskId: null, label: a.projectRole, hours: inPeriod, totalHours: remainder, rangeStart: range.start, rangeEnd: range.end });
    }
  }
  return { allocations, unscheduled };
}

/** Sum of allocated hours. */
export function sumHours(items: { hours: number }[]): number {
  return Math.round(items.reduce((s, i) => s + i.hours, 0) * 100) / 100;
}
