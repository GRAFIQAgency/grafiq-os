import "server-only";

import { allLoads, summarize } from "@/modules/capacity/calculations/load";
import { rangePeriod } from "@/modules/capacity/calculations/periods";
import { profileToCapacityPerson, talentToCapacityPerson } from "@/modules/capacity/services/people";
import type { CapacityDataset } from "@/modules/capacity/types";
import { ACTIVE_STATUSES } from "@/modules/projects/constants";
import { rowToMember, rowToTask } from "@/modules/projects/mappers";
import type { ProjectAssignment } from "@/modules/projects/types";
import { isAvailableForWork, rowToDetails, toCapacityRecord, toTalentPerson } from "@/modules/talent/services/bench";
import { rowToTalent } from "@/modules/sourcing/queries/mappers";
import type {
  ProfileCapacityDetailsRow, ProfileRow, ProjectMemberRow, ProjectRow, ProjectTaskRow, TalentBenchDetailsRow, TalentCandidateRow,
} from "@/types/database";

import { hermesClient } from "../client";
import { clampLimit, money } from "./shared";

type TalentJoined = TalentCandidateRow & { talent_bench_details: TalentBenchDetailsRow | TalentBenchDetailsRow[] | null };
type ProfileJoined = Pick<ProfileRow, "id" | "full_name" | "email"> & { profile_capacity_details: ProfileCapacityDetailsRow | ProfileCapacityDetailsRow[] | null };

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

/** Bench people as the Talent module sees them (shared mapping, no contact fields). */
async function benchPeople() {
  const supabase = hermesClient();
  const { data } = await supabase
    .from("talent_candidates").select("*, talent_bench_details(*)").eq("in_talent_bench", true)
    .returns<TalentJoined[]>();
  return (data ?? []).map((row) => {
    const details = one(row.talent_bench_details);
    return toTalentPerson(rowToTalent(row), details ? rowToDetails(details) : null);
  });
}

/** The Projects side of Capacity: members of projects in delivery with their tasks. */
async function assignments(): Promise<ProjectAssignment[]> {
  const supabase = hermesClient();
  const { data: projects } = await supabase
    .from("projects").select("id, name, status, start_date, deadline")
    .in("status", ACTIVE_STATUSES as unknown as string[])
    .returns<Pick<ProjectRow, "id" | "name" | "status" | "start_date" | "deadline">[]>();
  const list = projects ?? [];
  if (!list.length) return [];
  const ids = list.map((p) => p.id);
  const [members, tasks] = await Promise.all([
    supabase.from("project_members").select("*").in("project_id", ids).returns<ProjectMemberRow[]>(),
    supabase.from("project_tasks").select("*").in("project_id", ids).returns<ProjectTaskRow[]>(),
  ]);
  const out: ProjectAssignment[] = [];
  for (const p of list) {
    for (const row of (members.data ?? []).filter((m) => m.project_id === p.id)) {
      const m = rowToMember(row);
      if (m.status === "removed") continue;
      const mine = (tasks.data ?? []).filter((t) => t.assignee_member_id === m.id).map(rowToTask);
      out.push({
        projectId: p.id, projectName: p.name, projectStatus: p.status, projectStartDate: p.start_date, projectDeadline: p.deadline,
        memberId: m.id, talentCandidateId: m.talentCandidateId, userId: m.userId, displayName: m.displayName, projectRole: m.projectRole,
        memberStatus: m.status, plannedHours: m.plannedHours, startsOn: m.startsOn, endsOn: m.endsOn,
        taskEstimatedHours: mine.reduce((s, t) => s + (t.estimatedHours ?? 0), 0),
        taskActualHours: mine.reduce((s, t) => s + (t.actualHours ?? 0), 0),
        tasks: mine.map((t) => ({ id: t.id, title: t.title, status: t.status, estimatedHours: t.estimatedHours, startDate: t.startDate, dueDate: t.dueDate })),
      });
    }
  }
  return out;
}

/**
 * Who has how much free capacity between two dates. The hour maths is the
 * Capacity module's own (`allLoads` / `summarize`); a pay model never changes
 * capacity, and hours are never money.
 */
export async function capacitySnapshot(input: { from: string; to: string }) {
  const supabase = hermesClient();
  const [talent, profiles, projectAssignments] = await Promise.all([
    benchPeople(),
    supabase.from("profiles").select("id, full_name, email, profile_capacity_details(*)").order("full_name").returns<ProfileJoined[]>(),
    assignments(),
  ]);

  const dataset: CapacityDataset = {
    people: [
      ...talent.filter((p) => p.details.benchStatus !== "archived").map((p) => talentToCapacityPerson(toCapacityRecord(p))),
      ...(profiles.data ?? []).map((p) => profileToCapacityPerson({ id: p.id, full_name: p.full_name, email: p.email }, one(p.profile_capacity_details))),
    ],
    assignments: projectAssignments,
  };

  const period = rangePeriod(input.from, input.to);
  const loads = allLoads(dataset, period);
  const summary = summarize(loads);

  return {
    note: "Hours, not money. Capacity is derived from Talent (monthly capacity, availability) and Projects (planned hours, task dates). 'unknown' means the person has no capacity number configured.",
    period: { from: period.start, to: period.end },
    summary: {
      availableHours: summary.totalAvailable,
      bookedHours: summary.totalBooked,
      remainingHours: summary.remaining,
      unscheduledHours: summary.totalUnscheduled,
      utilizationPercent: summary.utilization,
      overloadedPeople: summary.overloadedPeople,
      peopleWithoutCapacityConfigured: summary.peopleUnconfigured,
    },
    people: loads.map((l) => ({
      key: l.person.key,
      name: l.person.name,
      role: l.person.role,
      kind: l.person.kind,
      availableHours: l.available,
      bookedHours: l.booked,
      remainingHours: l.remaining,
      utilizationPercent: l.utilization,
      health: l.health,
      unscheduledHours: l.unscheduled,
      projects: l.projects.map((p) => ({ projectId: p.projectId, project: p.projectName, hours: p.hours })),
    })),
  };
}

/**
 * Bench people who can take work. Deliberately narrow: name, role, rate and
 * availability only — no email, phone, profile link or notes.
 */
export async function talentAvailable(input: { role?: string; from?: string; to?: string; limit?: number }) {
  const people = await benchPeople();
  const today = new Date();
  const limit = clampLimit(input.limit);
  const wantedRole = input.role?.trim().toLowerCase();

  const matching = people
    .filter((p) => isAvailableForWork(p, today))
    .filter((p) => (wantedRole ? (p.candidate.role ?? "").toLowerCase().includes(wantedRole) : true))
    .filter((p) => (input.from ? !p.details.availableFrom || p.details.availableFrom <= input.from : true));

  return {
    note: "Bench people who are marked available. Contact details are never returned — reach people through the app.",
    window: input.from || input.to ? { from: input.from ?? null, to: input.to ?? null } : null,
    people: matching.slice(0, limit).map((p) => ({
      id: p.candidate.id,
      name: p.candidate.fullName,
      role: p.candidate.role,
      seniority: p.candidate.seniority,
      availability: p.candidate.availability,
      availableFrom: p.details.availableFrom,
      benchStatus: p.details.benchStatus,
      engagementType: p.engagementType,
      payModel: p.details.pricingModel,
      hourlyCost: p.hourlyCost == null ? null : money(p.hourlyCost, p.costCurrency ?? "CZK"),
      maxMonthlyHours: p.details.maxMonthlyHours,
      preferredMonthlyHours: p.details.preferredMonthlyHours,
    })),
    total: matching.length,
  };
}
