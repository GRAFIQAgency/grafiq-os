import { CURRENCIES } from "@/config/currencies";

import { CHANGE_REQUEST_STATUSES, COST_CATEGORIES, LINK_KINDS, MEMBER_STATUSES, MILESTONE_STATUSES, PRIORITIES, PROJECT_STATUSES, TASK_STATUSES } from "./constants";
import type { ActionResult, ChangeRequestStatus, DirectCostCategory, MilestoneStatus, ProjectLinkKind, ProjectMemberStatus, ProjectPriority, ProjectStatus, RateSource, TaskStatus } from "./types";
import type { Currency } from "@/types/database";

export interface ProjectValidationMessages {
  nameRequired: string;
  titleRequired: string;
  invalidNumber: string;
  invalidDate: string;
  invalidUrl: string;
  currency: string;
  personRequired: string;
  roleRequired: string;
  tooLong: string;
  margin: string;
}

type Outcome<T> = { data: T; errors?: undefined } | { data?: undefined; errors: ActionResult };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]) => (allowed.includes(v as T) ? (v as T) : undefined);
/** null = empty, undefined = invalid */
const optNum = (v: unknown): number | null | undefined => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};
const optInt = (v: unknown): number | null | undefined => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : undefined;
};
const optDate = (v: unknown): string | null | undefined => {
  const s = text(v, 10);
  if (!s) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : undefined;
};
const optId = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export interface ProjectInput {
  name: string;
  clientId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  projectType: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  ownerId: string | null;
  startDate: string | null;
  deadline: string | null;
  currency: Currency;
  baselineRevenue: number;
  baselineDirectCost: number;
  baselineTargetMargin: number;
  notes: string | null;
  estimateId: string | null;
}

export function validateProject(raw: unknown, msg: ProjectValidationMessages, defaults: { currency: Currency; targetMargin: number }): Outcome<ProjectInput> {
  if (!isRecord(raw)) return { errors: { error: msg.nameRequired } };
  const e: Record<string, string> = {};
  const name = text(raw.name, 200);
  if (!name) e.name = msg.nameRequired;
  const startDate = optDate(raw.startDate);
  const deadline = optDate(raw.deadline);
  if (startDate === undefined) e.startDate = msg.invalidDate;
  if (deadline === undefined) e.deadline = msg.invalidDate;
  const revenue = optNum(raw.baselineRevenue);
  const directCost = optNum(raw.baselineDirectCost);
  const margin = optNum(raw.baselineTargetMargin);
  if (revenue === undefined) e.baselineRevenue = msg.invalidNumber;
  if (directCost === undefined) e.baselineDirectCost = msg.invalidNumber;
  if (margin === undefined || (margin ?? 0) >= 100) e.baselineTargetMargin = msg.margin;
  const currency = oneOf(raw.currency, CURRENCIES) ?? defaults.currency;
  if (typeof raw.notes === "string" && raw.notes.length > 5000) e.notes = msg.tooLong;
  if (Object.keys(e).length) return { errors: { error: Object.values(e)[0], fieldErrors: e } };
  return {
    data: {
      name,
      clientId: optId(raw.clientId),
      contactName: text(raw.contactName, 200) || null,
      contactEmail: text(raw.contactEmail, 200) || null,
      contactPhone: text(raw.contactPhone, 60) || null,
      projectType: text(raw.projectType, 60) || "other",
      status: oneOf(raw.status, PROJECT_STATUSES) ?? "draft",
      priority: oneOf(raw.priority, PRIORITIES) ?? "normal",
      ownerId: optId(raw.ownerId),
      startDate: startDate ?? null,
      deadline: deadline ?? null,
      currency,
      baselineRevenue: revenue ?? 0,
      baselineDirectCost: directCost ?? 0,
      baselineTargetMargin: margin ?? defaults.targetMargin,
      notes: text(raw.notes, 5000) || null,
      estimateId: optId(raw.estimateId),
    },
  };
}

export interface MemberInput {
  talentCandidateId: string | null;
  userId: string | null;
  projectRole: string;
  status: ProjectMemberStatus;
  plannedHours: number | null;
  startsOn: string | null;
  endsOn: string | null;
  costRate: number | null;
  currency: Currency | null;
  rateSource: RateSource;
  notes: string | null;
}

export function validateMember(raw: unknown, msg: ProjectValidationMessages): Outcome<MemberInput> {
  if (!isRecord(raw)) return { errors: { error: msg.personRequired } };
  const e: Record<string, string> = {};
  const person = text(raw.person, 80); // "talent:<id>" | "user:<id>"
  const [kind, id] = person.split(":");
  const talentCandidateId = kind === "talent" && id ? id : null;
  const userId = kind === "user" && id ? id : null;
  if (!talentCandidateId && !userId) e.person = msg.personRequired;
  const projectRole = text(raw.projectRole, 100);
  if (!projectRole) e.projectRole = msg.roleRequired;
  const plannedHours = optNum(raw.plannedHours);
  const costRate = optNum(raw.costRate);
  const startsOn = optDate(raw.startsOn);
  const endsOn = optDate(raw.endsOn);
  if (plannedHours === undefined) e.plannedHours = msg.invalidNumber;
  if (costRate === undefined) e.costRate = msg.invalidNumber;
  if (startsOn === undefined) e.startsOn = msg.invalidDate;
  if (endsOn === undefined) e.endsOn = msg.invalidDate;
  if (Object.keys(e).length) return { errors: { error: Object.values(e)[0], fieldErrors: e } };
  return {
    data: {
      talentCandidateId, userId, projectRole,
      status: oneOf(raw.status, MEMBER_STATUSES) ?? "active",
      plannedHours: plannedHours ?? null, startsOn: startsOn ?? null, endsOn: endsOn ?? null,
      costRate: costRate ?? null, currency: oneOf(raw.currency, CURRENCIES) ?? null,
      rateSource: oneOf(raw.rateSource, ["talent", "role_default", "manual"] as const) ?? "manual",
      notes: text(raw.notes, 2000) || null,
    },
  };
}

export interface MilestoneInput { title: string; description: string | null; dueDate: string | null; ownerMemberId: string | null; status: MilestoneStatus; notes: string | null }
export function validateMilestone(raw: unknown, msg: ProjectValidationMessages): Outcome<MilestoneInput> {
  if (!isRecord(raw)) return { errors: { error: msg.titleRequired } };
  const e: Record<string, string> = {};
  const title = text(raw.title, 200);
  if (!title) e.title = msg.titleRequired;
  const dueDate = optDate(raw.dueDate);
  if (dueDate === undefined) e.dueDate = msg.invalidDate;
  if (Object.keys(e).length) return { errors: { error: Object.values(e)[0], fieldErrors: e } };
  return { data: { title, description: text(raw.description, 2000) || null, dueDate: dueDate ?? null, ownerMemberId: optId(raw.ownerMemberId), status: oneOf(raw.status, MILESTONE_STATUSES) ?? "not_started", notes: text(raw.notes, 2000) || null } };
}

export interface TaskInput {
  title: string; description: string | null; milestoneId: string | null; assigneeMemberId: string | null; status: TaskStatus; priority: ProjectPriority;
  estimatedHours: number | null; actualHours: number | null; startDate: string | null; dueDate: string | null; blockedReason: string | null; notes: string | null;
}
export function validateTask(raw: unknown, msg: ProjectValidationMessages): Outcome<TaskInput> {
  if (!isRecord(raw)) return { errors: { error: msg.titleRequired } };
  const e: Record<string, string> = {};
  const title = text(raw.title, 200);
  if (!title) e.title = msg.titleRequired;
  const estimatedHours = optNum(raw.estimatedHours);
  const actualHours = optNum(raw.actualHours);
  const startDate = optDate(raw.startDate);
  const dueDate = optDate(raw.dueDate);
  if (estimatedHours === undefined) e.estimatedHours = msg.invalidNumber;
  if (actualHours === undefined) e.actualHours = msg.invalidNumber;
  if (startDate === undefined) e.startDate = msg.invalidDate;
  if (dueDate === undefined) e.dueDate = msg.invalidDate;
  if (Object.keys(e).length) return { errors: { error: Object.values(e)[0], fieldErrors: e } };
  return {
    data: {
      title, description: text(raw.description, 5000) || null, milestoneId: optId(raw.milestoneId), assigneeMemberId: optId(raw.assigneeMemberId),
      status: oneOf(raw.status, TASK_STATUSES) ?? "todo", priority: oneOf(raw.priority, PRIORITIES) ?? "normal",
      estimatedHours: estimatedHours ?? null, actualHours: actualHours ?? null, startDate: startDate ?? null, dueDate: dueDate ?? null,
      blockedReason: text(raw.blockedReason, 500) || null, notes: text(raw.notes, 2000) || null,
    },
  };
}

export interface LinkInput { label: string; url: string; kind: ProjectLinkKind }
export function validateLink(raw: unknown, msg: ProjectValidationMessages): Outcome<LinkInput> {
  if (!isRecord(raw)) return { errors: { error: msg.titleRequired } };
  const e: Record<string, string> = {};
  const label = text(raw.label, 100);
  if (!label) e.label = msg.titleRequired;
  let url = text(raw.url, 1000);
  try {
    const u = new URL(url.includes("://") ? url : `https://${url}`);
    if (!["http:", "https:"].includes(u.protocol)) throw new Error("bad");
    url = u.toString();
  } catch {
    e.url = msg.invalidUrl;
  }
  if (Object.keys(e).length) return { errors: { error: Object.values(e)[0], fieldErrors: e } };
  return { data: { label, url, kind: oneOf(raw.kind, LINK_KINDS) ?? "other" } };
}

export interface DirectCostInput { label: string; category: DirectCostCategory; estimatedCost: number; actualCost: number | null; currency: Currency; note: string | null }
export function validateDirectCost(raw: unknown, msg: ProjectValidationMessages, defaultCurrency: Currency): Outcome<DirectCostInput> {
  if (!isRecord(raw)) return { errors: { error: msg.titleRequired } };
  const e: Record<string, string> = {};
  const label = text(raw.label, 200);
  if (!label) e.label = msg.titleRequired;
  const estimatedCost = optNum(raw.estimatedCost);
  const actualCost = optNum(raw.actualCost);
  if (estimatedCost === undefined) e.estimatedCost = msg.invalidNumber;
  if (actualCost === undefined) e.actualCost = msg.invalidNumber;
  if (Object.keys(e).length) return { errors: { error: Object.values(e)[0], fieldErrors: e } };
  return { data: { label, category: oneOf(raw.category, COST_CATEGORIES) ?? "other", estimatedCost: estimatedCost ?? 0, actualCost: actualCost ?? null, currency: oneOf(raw.currency, CURRENCIES) ?? defaultCurrency, note: text(raw.note, 1000) || null } };
}

export interface ChangeRequestInput { title: string; description: string | null; status: ChangeRequestStatus; additionalRevenue: number; additionalDirectCost: number; deadlineImpactDays: number | null; notes: string | null }
export function validateChangeRequest(raw: unknown, msg: ProjectValidationMessages): Outcome<ChangeRequestInput> {
  if (!isRecord(raw)) return { errors: { error: msg.titleRequired } };
  const e: Record<string, string> = {};
  const title = text(raw.title, 200);
  if (!title) e.title = msg.titleRequired;
  const additionalRevenue = optNum(raw.additionalRevenue);
  const additionalDirectCost = optNum(raw.additionalDirectCost);
  const deadlineImpactDays = optInt(raw.deadlineImpactDays);
  if (additionalRevenue === undefined) e.additionalRevenue = msg.invalidNumber;
  if (additionalDirectCost === undefined) e.additionalDirectCost = msg.invalidNumber;
  if (deadlineImpactDays === undefined) e.deadlineImpactDays = msg.invalidNumber;
  if (Object.keys(e).length) return { errors: { error: Object.values(e)[0], fieldErrors: e } };
  return { data: { title, description: text(raw.description, 5000) || null, status: oneOf(raw.status, CHANGE_REQUEST_STATUSES) ?? "draft", additionalRevenue: additionalRevenue ?? 0, additionalDirectCost: additionalDirectCost ?? 0, deadlineImpactDays: deadlineImpactDays ?? null, notes: text(raw.notes, 2000) || null } };
}
