import { describe, expect, it } from "vitest";

import { addDays, distributeHours, monthPeriod, monthsAhead, monthsCovering, overlap, parsePeriodKey, periodKey, shiftPeriod, weekPeriod, workingDays } from "./periods";

describe("periods", () => {
  it("builds month and ISO week periods", () => {
    expect(monthPeriod("2026-09-16")).toEqual({ kind: "month", start: "2026-09-01", end: "2026-09-30" });
    // 2026-09-16 is a Wednesday → week Mon 14 … Sun 20
    expect(weekPeriod("2026-09-16")).toEqual({ kind: "week", start: "2026-09-14", end: "2026-09-20" });
    // Sunday belongs to the week that started the previous Monday
    expect(weekPeriod("2026-09-20").start).toBe("2026-09-14");
  });

  it("shifts periods and round-trips keys", () => {
    const sep = monthPeriod("2026-09-01");
    expect(shiftPeriod(sep, 1).start).toBe("2026-10-01");
    expect(shiftPeriod(sep, -1).start).toBe("2026-08-01");
    expect(shiftPeriod(monthPeriod("2026-12-01"), 1).start).toBe("2027-01-01");
    expect(periodKey(sep)).toBe("2026-09");
    expect(parsePeriodKey("2026-09", "month", "2026-01-01")).toEqual(sep);
    const week = weekPeriod("2026-09-16");
    expect(periodKey(week)).toBe("2026-W38");
    expect(parsePeriodKey("2026-W38", "week", "2026-01-01")).toEqual(week);
    expect(shiftPeriod(week, 1).start).toBe("2026-09-21");
    // invalid keys fall back to today's period
    expect(parsePeriodKey("nope", "month", "2026-09-16")).toEqual(sep);
  });

  it("counts Monday–Friday working days", () => {
    expect(workingDays("2026-09-01", "2026-09-30")).toBe(22);
    expect(workingDays("2026-09-14", "2026-09-20")).toBe(5);
    expect(workingDays("2026-09-19", "2026-09-20")).toBe(0); // weekend only
    expect(workingDays("2026-09-30", "2026-09-01")).toBe(0);
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(overlap("2026-09-01", "2026-09-10", "2026-09-05", "2026-09-30")).toEqual({ start: "2026-09-05", end: "2026-09-10" });
    expect(overlap("2026-09-01", "2026-09-10", "2026-09-11", "2026-09-30")).toBeNull();
  });

  it("splits hours across two months proportionally by working days", () => {
    // Sep 16 → Oct 15 2026: Sep has 11 working days (16–30), Oct has 11 (1–15) → 50 / 50
    const sep = monthPeriod("2026-09-01");
    const oct = monthPeriod("2026-10-01");
    expect(distributeHours(80, "2026-09-16", "2026-10-15", sep)).toBeCloseTo(40);
    expect(distributeHours(80, "2026-09-16", "2026-10-15", oct)).toBeCloseTo(40);
    expect(distributeHours(80, "2026-09-16", "2026-10-15", monthPeriod("2026-11-01"))).toBe(0);
  });

  it("splits hours across two weeks proportionally", () => {
    // Wed 16 → Tue 22: 5 working days; week 38 gets Wed–Fri (3), week 39 gets Mon–Tue (2)
    const w38 = weekPeriod("2026-09-16");
    const w39 = weekPeriod("2026-09-22");
    expect(distributeHours(50, "2026-09-16", "2026-09-22", w38)).toBeCloseTo(30);
    expect(distributeHours(50, "2026-09-16", "2026-09-22", w39)).toBeCloseTo(20);
  });

  it("never loses hours on ranges without working days", () => {
    const sep = monthPeriod("2026-09-01");
    expect(distributeHours(4, "2026-09-19", "2026-09-19", sep)).toBe(4); // Saturday
    expect(distributeHours(4, "2026-09-19", "2026-09-19", monthPeriod("2026-10-01"))).toBe(0);
    expect(distributeHours(0, "2026-09-01", "2026-09-30", sep)).toBe(0);
  });

  it("lists months ahead and months covering a range", () => {
    expect(monthsAhead("2026-09-16", 3).map((p) => p.start)).toEqual(["2026-09-01", "2026-10-01", "2026-11-01"]);
    expect(monthsCovering("2026-09-20", "2026-11-02").map((p) => p.start)).toEqual(["2026-09-01", "2026-10-01", "2026-11-01"]);
  });
});
