import type {
  CapacityDataset, CapacityFilters, CapacityOverview, CapacityPerson, CapacitySummary, CapacityWarning, MatrixRow, Period,
  PersonLoad, ProjectAssignment, ProjectCapacityView, ProjectLoad,
} from "../types";
import { periodCapacity } from "./availability";
import { allocateAssignment, assignmentRange, assignmentWorkload, countsForCapacity, sumHours } from "./booking";
import { hasFreeCapacity, healthFor, isOverloaded, utilization } from "./health";
import { monthsAhead } from "./periods";

/** Stable person key shared by URLs, assignments and people. */
export function personKeyOf(kind: "talent" | "user", id: string): string {
  return `${kind}:${id}`;
}

export function assignmentPersonKey(a: ProjectAssignment): string | null {
  if (a.talentCandidateId) return personKeyOf("talent", a.talentCandidateId);
  if (a.userId) return personKeyOf("user", a.userId);
  return null;
}

/** Groups active assignments by person key. */
export function assignmentsByPerson(assignments: ProjectAssignment[]): Map<string, ProjectAssignment[]> {
  const map = new Map<string, ProjectAssignment[]>();
  for (const a of assignments) {
    if (!countsForCapacity(a)) continue;
    const key = assignmentPersonKey(a);
    if (!key) continue;
    (map.get(key) ?? map.set(key, []).get(key)!).push(a);
  }
  return map;
}

/** One project's share of a person's load in the period. */
export function projectLoad(a: ProjectAssignment, personKey: string, period: Period): ProjectLoad {
  const { allocations, unscheduled } = allocateAssignment(a, personKey, period);
  const { taskHours, planned } = assignmentWorkload(a);
  return {
    projectId: a.projectId, projectName: a.projectName, projectStatus: a.projectStatus, projectDeadline: a.projectDeadline,
    memberId: a.memberId, projectRole: a.projectRole, startsOn: a.startsOn, endsOn: a.endsOn,
    plannedHours: planned, taskEstimatedHours: taskHours,
    hours: sumHours(allocations),
    taskHours: sumHours(allocations.filter((x) => x.source === "task")),
    remainderHours: sumHours(allocations.filter((x) => x.source === "remainder")),
    unscheduledHours: sumHours(unscheduled),
    allocations,
  };
}

/** Warnings for one person in one period — only actionable ones. */
export function personWarnings(person: CapacityPerson, period: Period, available: number | null, booked: number, projects: ProjectLoad[], assignments: ProjectAssignment[]): CapacityWarning[] {
  const out: CapacityWarning[] = [];
  const key = person.key;
  if (available == null) out.push({ code: "missing_capacity", personKey: key, params: {} });
  if (available != null && booked > available) out.push({ code: "overloaded", personKey: key, params: { hours: Math.round((booked - available) * 10) / 10 } });
  if (available === 0 && person.monthlyCapacity != null && assignments.length) out.push({ code: "unavailable", personKey: key, params: {} });
  if (person.availability === "limited" && booked > 0) out.push({ code: "limited_availability", personKey: key, params: {} });
  for (const p of projects) {
    if (p.unscheduledHours > 0) out.push({ code: "unscheduled_hours", personKey: key, projectId: p.projectId, projectName: p.projectName, params: { hours: p.unscheduledHours } });
  }
  for (const a of assignments) {
    const { workload } = assignmentWorkload(a);
    if (workload === 0) out.push({ code: "no_planned_hours", personKey: key, projectId: a.projectId, projectName: a.projectName, params: {} });
    const range = assignmentRange(a);
    if (range && person.availableFrom && range.start < person.availableFrom) {
      out.push({ code: "starts_before_available", personKey: key, projectId: a.projectId, projectName: a.projectName, params: { date: person.availableFrom } });
    }
    if (a.endsOn && a.projectDeadline && a.endsOn > a.projectDeadline) {
      out.push({ code: "ends_after_deadline", personKey: key, projectId: a.projectId, projectName: a.projectName, params: { date: a.projectDeadline } });
    }
  }
  return out;
}

/** The core: one person, one period. */
export function personLoad(person: CapacityPerson, assignments: ProjectAssignment[], period: Period): PersonLoad {
  const mine = assignments.filter((a) => countsForCapacity(a) && assignmentPersonKey(a) === person.key);
  const projects = mine.map((a) => projectLoad(a, person.key, period)).sort((a, b) => b.hours - a.hours || a.projectName.localeCompare(b.projectName));
  const available = periodCapacity(person, period);
  const booked = sumHours(projects);
  const unscheduled = sumHours(projects.map((p) => ({ hours: p.unscheduledHours })));
  return {
    person, period, available, booked, unscheduled,
    remaining: available == null ? null : Math.round((available - booked) * 100) / 100,
    utilization: utilization(booked, available),
    health: healthFor(booked, available),
    activeAssignments: mine.length,
    projects,
    warnings: personWarnings(person, period, available, booked, projects, mine),
  };
}

export function allLoads(data: CapacityDataset, period: Period): PersonLoad[] {
  return data.people.map((p) => personLoad(p, data.assignments, period));
}

export function summarize(loads: PersonLoad[]): CapacitySummary {
  const configured = loads.filter((l) => l.available != null);
  const totalAvailable = sumHours(configured.map((l) => ({ hours: l.available ?? 0 })));
  const totalBooked = sumHours(loads.map((l) => ({ hours: l.booked })));
  return {
    totalAvailable,
    totalBooked,
    totalUnscheduled: sumHours(loads.map((l) => ({ hours: l.unscheduled }))),
    remaining: Math.round((totalAvailable - sumHours(configured.map((l) => ({ hours: l.booked })))) * 100) / 100,
    utilization: utilization(sumHours(configured.map((l) => ({ hours: l.booked }))), totalAvailable),
    overloadedPeople: loads.filter((l) => isOverloaded(l.booked, l.available)).length,
    peopleWithFreeCapacity: loads.filter((l) => hasFreeCapacity(l.booked, l.available)).length,
    peopleUnconfigured: loads.filter((l) => l.available == null).length,
    people: loads.length,
  };
}

const lc = (s: string | null | undefined) => (s ?? "").toLowerCase();

export function matchesFilters(load: PersonLoad, f: CapacityFilters): boolean {
  const p = load.person;
  if (f.q && !f.q.toLowerCase().split(/\s+/).every((w) => `${lc(p.name)} ${lc(p.role)}`.includes(w))) return false;
  if (f.role && !lc(p.role).includes(f.role.toLowerCase())) return false;
  if (f.kind && p.kind !== f.kind) return false;
  if (f.availability && p.availability !== f.availability) return false;
  if (f.overloadedOnly && !isOverloaded(load.booked, load.available)) return false;
  if (f.freeOnly && !hasFreeCapacity(load.booked, load.available)) return false;
  if (f.projectId && !load.projects.some((x) => x.projectId === f.projectId)) return false;
  return true;
}

const HEALTH_RANK = { red: 0, orange: 1, yellow: 2, green: 3, unconfigured: 4, unavailable: 5 } as const;

/** Most urgent first: overloaded, then by utilization, then name. */
export function sortLoads(loads: PersonLoad[]): PersonLoad[] {
  return [...loads].sort((a, b) => HEALTH_RANK[a.health] - HEALTH_RANK[b.health] || (b.utilization ?? -1) - (a.utilization ?? -1) || a.person.name.localeCompare(b.person.name));
}

/** Projects view: hours per project in the period, people and capacity conflicts. */
export function projectViews(loads: PersonLoad[]): ProjectCapacityView[] {
  const map = new Map<string, ProjectCapacityView>();
  for (const l of loads) {
    for (const p of l.projects) {
      // Projects that do not touch the period (no placed and no unscheduled hours) stay out of the view.
      if (p.hours === 0 && p.unscheduledHours === 0) continue;
      const view = map.get(p.projectId) ?? { projectId: p.projectId, projectName: p.projectName, projectStatus: p.projectStatus, projectDeadline: p.projectDeadline, hours: 0, people: [], conflicts: [] };
      view.hours = Math.round((view.hours + p.hours) * 100) / 100;
      view.people.push({ personKey: l.person.key, name: l.person.name, role: p.projectRole, hours: p.hours, unscheduled: p.unscheduledHours, utilization: l.utilization, health: l.health });
      if (l.remaining != null && l.remaining < 0 && p.hours > 0) view.conflicts.push({ personKey: l.person.key, name: l.person.name, overBy: Math.round(-l.remaining * 10) / 10 });
      map.set(p.projectId, view);
    }
  }
  return [...map.values()]
    .map((v) => ({ ...v, people: v.people.sort((a, b) => b.hours - a.hours) }))
    .sort((a, b) => b.conflicts.length - a.conflicts.length || b.hours - a.hours || a.projectName.localeCompare(b.projectName));
}

/** Forward-planning matrix: utilization per person per month. */
export function planningMatrix(data: CapacityDataset, from: string, months: number): { periods: Period[]; rows: MatrixRow[] } {
  const periods = monthsAhead(from, months);
  const rows = data.people.map((person) => ({
    person,
    cells: periods.map((period) => {
      const l = personLoad(person, data.assignments, period);
      return { period, available: l.available, booked: l.booked, utilization: l.utilization, health: l.health };
    }),
  }));
  return { periods, rows: rows.sort((a, b) => a.person.name.localeCompare(b.person.name)) };
}

/** Dashboard read shape. */
export function overview(data: CapacityDataset, period: Period): CapacityOverview {
  const loads = allLoads(data, period);
  const s = summarize(loads);
  return {
    period,
    utilization: s.utilization,
    overloadedPeople: s.overloadedPeople,
    availableHours: s.totalAvailable,
    remainingHours: s.remaining,
    mostFree: loads
      .filter((l) => l.remaining != null && l.remaining > 0)
      .sort((a, b) => (b.remaining ?? 0) - (a.remaining ?? 0))
      .slice(0, 5)
      .map((l) => ({ personKey: l.person.key, name: l.person.name, role: l.person.role, remaining: l.remaining ?? 0 })),
  };
}
