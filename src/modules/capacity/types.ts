import type { ProjectAssignment, ProjectStatus, TaskStatus } from "@/modules/projects/types";
import type { BenchStatus, PricingModel, TalentAvailability } from "@/types/database";

export type { ProjectAssignment };

/** People come from two identities that are never merged: Talent Bench people and internal users. */
export type PersonKind = "talent" | "user";

/** Where a person's capacity number comes from. */
export type CapacitySource = "preferred" | "maximum" | "internal" | "none";

/**
 * A person as Capacity sees them: identity + the capacity/availability facts
 * owned by Talent (bench people) or profile_capacity_details (internal users).
 */
export interface CapacityPerson {
  /** `talent:<id>` or `user:<id>` — stable key used in URLs. */
  key: string;
  kind: PersonKind;
  id: string;
  name: string;
  role: string | null;
  /** Talent availability flag; null for internal users. */
  availability: TalentAvailability | null;
  /** Person is bookable from this date (Talent "available from"). */
  availableFrom: string | null;
  benchStatus: BenchStatus | null;
  /** Internal users can be excluded from planning. */
  capacityActive: boolean;
  /** Normal monthly planning capacity in hours; null = not configured. */
  monthlyCapacity: number | null;
  /** Hard monthly upper limit in hours; null = unknown. */
  monthlyMaximum: number | null;
  capacitySource: CapacitySource;
  /** Informational only — the pay model NEVER changes capacity maths. */
  pricingModel: PricingModel | null;
}

/** An inclusive date range in YYYY-MM-DD, used for months, ISO weeks and what-if ranges. */
export interface Period {
  kind: "month" | "week" | "range";
  start: string;
  end: string;
}

export type AllocationSource = "task" | "remainder" | "planned";

/** Hours of one work item placed into one period. */
export interface Allocation {
  projectId: string;
  projectName: string;
  memberId: string;
  personKey: string;
  source: AllocationSource;
  /** Task id for task allocations. */
  taskId: string | null;
  label: string;
  /** Hours that fall into the period. */
  hours: number;
  /** Full hours of the item (before proportional split). */
  totalHours: number;
  rangeStart: string | null;
  rangeEnd: string | null;
}

/** Hours that exist but cannot be placed in time (no dates at task, assignment or project level). */
export interface UnscheduledHours {
  projectId: string;
  projectName: string;
  memberId: string;
  personKey: string;
  label: string;
  hours: number;
}

export type CapacityHealth = "green" | "yellow" | "orange" | "red" | "unconfigured" | "unavailable";

export type CapacityWarningCode =
  | "overloaded"
  | "unavailable"
  | "starts_before_available"
  | "missing_capacity"
  | "unscheduled_hours"
  | "no_planned_hours"
  | "ends_after_deadline"
  | "limited_availability";

export interface CapacityWarning {
  code: CapacityWarningCode;
  personKey: string;
  projectId?: string;
  projectName?: string;
  params: Record<string, string | number>;
}

/** One project's share of a person's period load. */
export interface ProjectLoad {
  projectId: string;
  projectName: string;
  projectStatus: ProjectStatus;
  projectDeadline: string | null;
  memberId: string;
  projectRole: string;
  startsOn: string | null;
  endsOn: string | null;
  plannedHours: number | null;
  taskEstimatedHours: number;
  /** Hours placed into the selected period. */
  hours: number;
  taskHours: number;
  remainderHours: number;
  unscheduledHours: number;
  allocations: Allocation[];
}

/** Everything the people table and the person page need for one person in one period. */
export interface PersonLoad {
  person: CapacityPerson;
  period: Period;
  /** Capacity in the period after availability rules; null = not configured. */
  available: number | null;
  booked: number;
  unscheduled: number;
  /** available − booked; null when unconfigured. Negative = overloaded. */
  remaining: number | null;
  /** Percent; null when unconfigured or no capacity. */
  utilization: number | null;
  health: CapacityHealth;
  activeAssignments: number;
  projects: ProjectLoad[];
  warnings: CapacityWarning[];
}

export interface CapacitySummary {
  totalAvailable: number;
  totalBooked: number;
  totalUnscheduled: number;
  remaining: number;
  /** Percent; null when nobody has capacity configured. */
  utilization: number | null;
  overloadedPeople: number;
  peopleWithFreeCapacity: number;
  peopleUnconfigured: number;
  people: number;
}

export interface ProjectCapacityView {
  projectId: string;
  projectName: string;
  projectStatus: ProjectStatus;
  projectDeadline: string | null;
  /** Hours of this project inside the period. */
  hours: number;
  people: { personKey: string; name: string; role: string; hours: number; unscheduled: number; utilization: number | null; health: CapacityHealth }[];
  conflicts: { personKey: string; name: string; overBy: number }[];
}

export interface MatrixCell {
  period: Period;
  available: number | null;
  booked: number;
  utilization: number | null;
  health: CapacityHealth;
}

export interface MatrixRow {
  person: CapacityPerson;
  cells: MatrixCell[];
}

export interface WhatIfInput {
  /** Either a specific person key or a role to search for. */
  personKey?: string;
  role?: string;
  hours: number;
  start: string;
  end: string;
}

export interface WhatIfCandidate {
  person: CapacityPerson;
  available: number | null;
  booked: number;
  remaining: number | null;
  forecast: number;
  forecastUtilization: number | null;
  /** Positive = over capacity by this many hours. */
  overBy: number;
  health: CapacityHealth;
}

export interface WhatIfResult {
  input: WhatIfInput;
  period: Period;
  candidates: WhatIfCandidate[];
}

export interface CapacityFilters {
  q?: string;
  role?: string;
  kind?: PersonKind;
  availability?: TalentAvailability;
  overloadedOnly?: boolean;
  freeOnly?: boolean;
  projectId?: string;
}

export type CapacityView = "people" | "projects";

/** Raw inputs: the two read APIs Capacity combines. */
export interface CapacityDataset {
  people: CapacityPerson[];
  assignments: ProjectAssignment[];
}

/** Read API for Dashboard. */
export interface CapacityOverview {
  period: Period;
  /** Null when nobody has capacity configured — "unknown", never render as 0 %. */
  utilization: number | null;
  overloadedPeople: number;
  availableHours: number;
  remainingHours: number;
  unscheduledHours: number;
  /** People with a configured capacity number, and those without. */
  configuredPeople: number;
  unconfiguredPeople: number;
  mostFree: { personKey: string; name: string; role: string | null; remaining: number; utilization: number | null }[];
  /** People booked above their capacity, worst first. */
  overloaded: { personKey: string; name: string; role: string | null; overBy: number; utilization: number | null }[];
}

export interface InternalCapacityInput {
  monthlyCapacityHours: number;
  preferredMonthlyHours: number | null;
  capacityActive: boolean;
  notes: string | null;
}

export interface ActionResult {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export type { TaskStatus };
