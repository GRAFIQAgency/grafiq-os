import { describe, expect, it } from "vitest";

import type { CapacityPerson, ProjectAssignment } from "../types";
import { isUnavailableInPeriod, periodCapacity, rangeCapacity } from "./availability";
import { allocateAssignment, assignmentWorkload, resolveRange } from "./booking";
import { hasFreeCapacity, healthFor, isOverloaded, utilization } from "./health";
import { allLoads, personLoad, planningMatrix, projectViews, summarize } from "./load";
import { monthPeriod, weekPeriod } from "./periods";
import { simulate } from "./whatif";

const SEP = monthPeriod("2026-09-01");
const OCT = monthPeriod("2026-10-01");

export function person(over: Partial<CapacityPerson> & { id: string; name: string }): CapacityPerson {
  const kind = over.kind ?? "talent";
  return {
    key: `${kind}:${over.id}`, kind, role: "Webflow Developer", availability: "available", availableFrom: null, benchStatus: "active",
    capacityActive: true, monthlyCapacity: 100, monthlyMaximum: 120, capacitySource: "preferred", pricingModel: "hourly", ...over,
  };
}

export function assignment(over: Partial<ProjectAssignment> & { projectId: string; memberId: string }): ProjectAssignment {
  return {
    projectName: `Project ${over.projectId}`, projectStatus: "active", projectStartDate: "2026-09-01", projectDeadline: "2026-09-30",
    talentCandidateId: "p1", userId: null, displayName: "Petr", projectRole: "Developer", memberStatus: "active",
    plannedHours: null, startsOn: null, endsOn: null, taskEstimatedHours: 0, taskActualHours: 0, tasks: [], ...over,
  };
}

const task = (id: string, estimatedHours: number | null, startDate: string | null = null, dueDate: string | null = null) =>
  ({ id, title: `Task ${id}`, status: "todo" as const, estimatedHours, startDate, dueDate });

describe("person capacity", () => {
  const petr = person({ id: "p1", name: "Petr" });

  it("month = the monthly number; week = monthly × 12/52", () => {
    expect(periodCapacity(petr, SEP)).toBe(100);
    expect(periodCapacity(petr, weekPeriod("2026-09-16"))).toBeCloseTo(100 / (52 / 12), 2);
  });

  it("uses preferred workload as planning capacity and maximum only as fallback", () => {
    expect(person({ id: "a", name: "A", monthlyCapacity: 80, monthlyMaximum: 160, capacitySource: "preferred" }).monthlyCapacity).toBe(80);
    const maxOnly = person({ id: "b", name: "B", monthlyCapacity: 160, monthlyMaximum: 160, capacitySource: "maximum" });
    expect(periodCapacity(maxOnly, SEP)).toBe(160);
  });

  it("does not invent a number when capacity is not configured", () => {
    const none = person({ id: "n", name: "Nobody", monthlyCapacity: null, monthlyMaximum: null, capacitySource: "none" });
    expect(periodCapacity(none, SEP)).toBeNull();
    expect(healthFor(0, null)).toBe("unconfigured");
    expect(personLoad(none, [], SEP).health).toBe("unconfigured");
  });

  it("respects available-from by prorating working days", () => {
    // Available from Sep 16: 11 of 22 working days → 50 h
    const late = person({ id: "l", name: "Late", availableFrom: "2026-09-16" });
    expect(periodCapacity(late, SEP)).toBe(50);
    expect(periodCapacity(person({ id: "x", name: "X", availableFrom: "2026-10-01" }), SEP)).toBe(0);
    expect(isUnavailableInPeriod(person({ id: "x", name: "X", availableFrom: "2026-10-01" }), SEP)).toBe(true);
    expect(periodCapacity(late, OCT)).toBe(100);
  });

  it("treats unavailable, paused and archived people as 0 h", () => {
    expect(periodCapacity(person({ id: "u", name: "U", availability: "unavailable" }), SEP)).toBe(0);
    expect(periodCapacity(person({ id: "p", name: "P", benchStatus: "paused" }), SEP)).toBe(0);
    expect(periodCapacity(person({ id: "a", name: "A", benchStatus: "archived" }), SEP)).toBe(0);
    expect(periodCapacity(person({ id: "i", name: "I", kind: "user", capacityActive: false, capacitySource: "internal" }), SEP)).toBe(0);
    expect(healthFor(0, 0)).toBe("unavailable");
  });

  it("internal profile capacity works like talent capacity", () => {
    const alex = person({ id: "u1", name: "Alex", kind: "user", availability: null, benchStatus: null, monthlyCapacity: 120, monthlyMaximum: 120, capacitySource: "internal", pricingModel: null });
    expect(periodCapacity(alex, SEP)).toBe(120);
    expect(alex.key).toBe("user:u1");
  });

  it("computes capacity for an arbitrary range month by month", () => {
    // Sep 16 → Oct 15: 11/22 of Sep + 11/22 of Oct = 100
    expect(rangeCapacity(petr, "2026-09-16", "2026-10-15")).toBe(100);
    expect(rangeCapacity(person({ id: "n", name: "N", monthlyCapacity: null, capacitySource: "none" }), "2026-09-01", "2026-09-30")).toBeNull();
  });
});

describe("booked hours", () => {
  it("uses max(planned, task hours) so tasks never double-count planned hours", () => {
    const a = assignment({ projectId: "A", memberId: "m1", plannedHours: 40, tasks: [task("t1", 30, "2026-09-01", "2026-09-10")] });
    expect(assignmentWorkload(a)).toEqual({ taskHours: 30, planned: 40, workload: 40, remainder: 10 });
    const load = personLoad(person({ id: "p1", name: "Petr" }), [a], SEP);
    expect(load.booked).toBe(40);
    expect(load.projects[0].taskHours).toBe(30);
    expect(load.projects[0].remainderHours).toBe(10);
  });

  it("uses task hours when they exceed the planned budget", () => {
    const a = assignment({ projectId: "A", memberId: "m1", plannedHours: 20, tasks: [task("t1", 30, "2026-09-01", "2026-09-10")] });
    expect(assignmentWorkload(a).workload).toBe(30);
    expect(assignmentWorkload(a).remainder).toBe(0);
  });

  it("places task hours by task dates and the remainder by assignment dates", () => {
    const a = assignment({
      projectId: "A", memberId: "m1", plannedHours: 80, startsOn: "2026-09-16", endsOn: "2026-10-15",
      tasks: [task("t1", 20, "2026-09-01", "2026-09-04")],
    });
    // task: 20 h all in Sep; remainder 60 h split 50/50 between Sep and Oct
    const sep = personLoad(person({ id: "p1", name: "Petr" }), [a], SEP);
    const oct = personLoad(person({ id: "p1", name: "Petr" }), [a], OCT);
    expect(sep.booked).toBeCloseTo(50);
    expect(oct.booked).toBeCloseTo(30);
  });

  it("falls back to project dates and one-day ranges", () => {
    expect(resolveRange(null, null, null, { start: "2026-09-01", end: "2026-09-30" })).toEqual({ start: "2026-09-01", end: "2026-09-30" });
    expect(resolveRange("2026-09-10", null, null)).toEqual({ start: "2026-09-10", end: "2026-09-10" });
    expect(resolveRange(null, "2026-09-10", { start: "2026-09-01", end: "2026-09-30" })).toEqual({ start: "2026-09-01", end: "2026-09-10" });
    const a = assignment({ projectId: "A", memberId: "m1", plannedHours: 44 }); // only project dates (Sep)
    expect(personLoad(person({ id: "p1", name: "Petr" }), [a], SEP).booked).toBe(44);
  });

  it("surfaces unscheduled hours instead of inventing dates", () => {
    const a = assignment({ projectId: "A", memberId: "m1", plannedHours: 20, projectStartDate: null, projectDeadline: null, tasks: [task("t1", 8)] });
    const { allocations, unscheduled } = allocateAssignment(a, "talent:p1", SEP);
    expect(allocations).toEqual([]);
    expect(unscheduled.map((u) => u.hours)).toEqual([8, 12]);
    const load = personLoad(person({ id: "p1", name: "Petr" }), [a], SEP);
    expect(load.booked).toBe(0);
    expect(load.unscheduled).toBe(20);
    expect(load.warnings.some((w) => w.code === "unscheduled_hours")).toBe(true);
  });

  it("ignores completed, cancelled, archived, draft and on-hold projects and removed members", () => {
    const petr = person({ id: "p1", name: "Petr" });
    for (const status of ["completed", "cancelled", "archived", "draft", "on_hold"] as const) {
      expect(personLoad(petr, [assignment({ projectId: status, memberId: "m", plannedHours: 50, projectStatus: status })], SEP).booked).toBe(0);
    }
    expect(personLoad(petr, [assignment({ projectId: "r", memberId: "m", plannedHours: 50, memberStatus: "removed" })], SEP).booked).toBe(0);
    for (const status of ["onboarding", "active", "waiting_client", "internal_review"] as const) {
      expect(personLoad(petr, [assignment({ projectId: status, memberId: "m", plannedHours: 50, projectStatus: status })], SEP).booked).toBe(50);
    }
  });

  it("pay model never changes workload: fixed and percent people still consume planned hours", () => {
    const a = assignment({ projectId: "A", memberId: "m1", plannedHours: 30 });
    const hourly = person({ id: "p1", name: "Hourly", pricingModel: "hourly" });
    const fixed = person({ id: "p1", name: "Fixed", pricingModel: "fixed" });
    const percent = person({ id: "p1", name: "Percent", pricingModel: "percent" });
    expect(personLoad(hourly, [a], SEP).booked).toBe(30);
    expect(personLoad(fixed, [a], SEP).booked).toBe(30);
    expect(personLoad(percent, [a], SEP).booked).toBe(30);
    // no hours planned → nothing inferred from money, and a warning instead
    const none = personLoad(fixed, [assignment({ projectId: "B", memberId: "m2" })], SEP);
    expect(none.booked).toBe(0);
    expect(none.warnings.some((w) => w.code === "no_planned_hours")).toBe(true);
  });

  it("only counts assignments of the same identity", () => {
    const a = assignment({ projectId: "A", memberId: "m1", plannedHours: 30, talentCandidateId: null, userId: "u1" });
    expect(personLoad(person({ id: "u1", name: "Alex", kind: "user" }), [a], SEP).booked).toBe(30);
    expect(personLoad(person({ id: "u1", name: "Other" }), [a], SEP).booked).toBe(0); // talent:u1 ≠ user:u1
  });
});

describe("health and utilization", () => {
  it("bands follow the constants", () => {
    expect(utilization(72, 100)).toBe(72);
    expect(healthFor(50, 100)).toBe("green");
    expect(healthFor(75, 100)).toBe("yellow");
    expect(healthFor(90, 100)).toBe("orange");
    expect(healthFor(100, 100)).toBe("red");
    expect(healthFor(115, 100)).toBe("red");
    expect(healthFor(10, 0)).toBe("red");
    expect(isOverloaded(115, 100)).toBe(true);
    expect(isOverloaded(100, 100)).toBe(false);
    expect(hasFreeCapacity(28, 100)).toBe(true);
    expect(hasFreeCapacity(95, 100)).toBe(false);
    expect(hasFreeCapacity(0, null)).toBe(false);
  });

  it("detects an overloaded person with a warning and a negative remaining", () => {
    const alex = person({ id: "p1", name: "Alex" });
    const load = personLoad(alex, [assignment({ projectId: "A", memberId: "m1", plannedHours: 115 })], SEP);
    expect(load.booked).toBe(115);
    expect(load.remaining).toBe(-15);
    expect(load.utilization).toBe(115);
    expect(load.health).toBe("red");
    expect(load.warnings.find((w) => w.code === "overloaded")?.params.hours).toBe(15);
  });

  it("warns when an assignment starts before the person is available", () => {
    const late = person({ id: "p1", name: "Late", availableFrom: "2026-09-16" });
    const load = personLoad(late, [assignment({ projectId: "A", memberId: "m1", plannedHours: 10, startsOn: "2026-09-01", endsOn: "2026-09-30" })], SEP);
    expect(load.warnings.some((w) => w.code === "starts_before_available")).toBe(true);
  });
});

describe("summary, projects view, matrix", () => {
  const people = [
    person({ id: "p1", name: "Petr" }),
    person({ id: "p2", name: "Alex" }),
    person({ id: "p3", name: "Nobody", monthlyCapacity: null, monthlyMaximum: null, capacitySource: "none" }),
  ];
  const assignments = [
    assignment({ projectId: "A", projectName: "Website ABC", memberId: "m1", plannedHours: 72, talentCandidateId: "p1" }),
    assignment({ projectId: "A", projectName: "Website ABC", memberId: "m2", plannedHours: 115, talentCandidateId: "p2" }),
    assignment({ projectId: "B", projectName: "Branding", memberId: "m3", plannedHours: 44, talentCandidateId: "p1", projectStartDate: "2026-10-01", projectDeadline: "2026-10-31" }),
  ];

  it("summarises the agency for the period", () => {
    const s = summarize(allLoads({ people, assignments }, SEP));
    expect(s.totalAvailable).toBe(200);
    expect(s.totalBooked).toBe(187);
    expect(s.remaining).toBe(13);
    expect(s.utilization).toBe(93.5);
    expect(s.overloadedPeople).toBe(1);
    expect(s.peopleWithFreeCapacity).toBe(1);
    expect(s.peopleUnconfigured).toBe(1);
  });

  it("builds the projects view with conflicts", () => {
    const views = projectViews(allLoads({ people, assignments }, SEP));
    const abc = views.find((v) => v.projectId === "A")!;
    expect(abc.hours).toBe(187);
    expect(abc.people.map((p) => p.name)).toEqual(["Alex", "Petr"]);
    expect(abc.conflicts).toEqual([{ personKey: "talent:p2", name: "Alex", overBy: 15 }]);
    expect(views.find((v) => v.projectId === "B")).toBeUndefined(); // October project not in September
  });

  it("builds a correct multi-month matrix", () => {
    const { periods, rows } = planningMatrix({ people, assignments }, "2026-09-16", 3);
    expect(periods.map((p) => p.start)).toEqual(["2026-09-01", "2026-10-01", "2026-11-01"]);
    const petr = rows.find((r) => r.person.id === "p1")!;
    expect(petr.cells.map((c) => c.utilization)).toEqual([72, 44, 0]);
    expect(petr.cells.map((c) => c.health)).toEqual(["green", "green", "green"]);
    const alex = rows.find((r) => r.person.id === "p2")!;
    expect(alex.cells[0].utilization).toBe(115);
    expect(rows.find((r) => r.person.id === "p3")!.cells[0].utilization).toBeNull();
  });
});

describe("what-if simulation", () => {
  const people = [
    person({ id: "jan", name: "Jan" }),
    person({ id: "petr", name: "Petr" }),
    person({ id: "david", name: "David" }),
    person({ id: "eva", name: "Eva", role: "Copywriter" }),
    person({ id: "tom", name: "Tom", role: "Webflow Developer", benchStatus: "paused" }),
  ];
  const assignments = [
    assignment({ projectId: "A", memberId: "m1", plannedHours: 36, talentCandidateId: "jan", projectStartDate: "2026-10-01", projectDeadline: "2026-10-31" }),
    assignment({ projectId: "A", memberId: "m2", plannedHours: 75, talentCandidateId: "petr", projectStartDate: "2026-10-01", projectDeadline: "2026-10-31" }),
    assignment({ projectId: "A", memberId: "m3", plannedHours: 92, talentCandidateId: "david", projectStartDate: "2026-10-01", projectDeadline: "2026-10-31" }),
  ];
  const data = { people, assignments };

  it("forecasts one person and reports the overload", () => {
    const r = simulate(data, { personKey: "talent:petr", hours: 60, start: "2026-10-01", end: "2026-10-31" });
    expect(r.candidates).toHaveLength(1);
    const c = r.candidates[0];
    expect(c.available).toBe(100);
    expect(c.booked).toBe(75);
    expect(c.forecast).toBe(135);
    expect(c.overBy).toBe(35);
    expect(c.health).toBe("red");
  });

  it("ranks matching, plannable people by remaining capacity for a role", () => {
    const r = simulate(data, { role: "webflow", hours: 20, start: "2026-10-01", end: "2026-10-31" });
    expect(r.candidates.map((c) => `${c.person.name} ${c.remaining}`)).toEqual(["Jan 64", "Petr 25", "David 8"]);
  });

  it("does not mutate the dataset", () => {
    const snapshot = JSON.stringify(data);
    simulate(data, { role: "webflow", hours: 500, start: "2026-10-01", end: "2026-10-31" });
    simulate(data, { personKey: "talent:jan", hours: 500, start: "2026-10-01", end: "2026-10-31" });
    expect(JSON.stringify(data)).toBe(snapshot);
  });
});
