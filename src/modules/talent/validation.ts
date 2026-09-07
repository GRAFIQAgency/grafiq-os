import { CURRENCIES } from "@/config/currencies";

import { BENCH_STATUSES, ENGAGEMENT_TYPES } from "./constants";
import type { ActionResult, BenchDetailsInput } from "./types";

export interface BenchValidationMessages {
  invalidNumber: string;
  invalidDate: string;
  hoursRange: string;
  invalidStatus: string;
  tooLong: string;
}

type Outcome = { data: BenchDetailsInput; errors?: undefined } | { data?: undefined; errors: ActionResult };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]) => (allowed.includes(v as T) ? (v as T) : undefined);
const optNum = (v: unknown): number | null | undefined => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : undefined; // undefined = invalid
};

export function validateBenchDetails(raw: unknown, msg: BenchValidationMessages): Outcome {
  if (!isRecord(raw)) return { errors: { error: msg.invalidStatus } };
  const fieldErrors: Record<string, string> = {};

  const benchStatus = oneOf(raw.benchStatus, BENCH_STATUSES);
  if (!benchStatus) fieldErrors.benchStatus = msg.invalidStatus;

  const hourlyCost = optNum(raw.hourlyCost);
  const dayRate = optNum(raw.dayRate);
  const maxMonthlyHours = optNum(raw.maxMonthlyHours);
  const preferredMonthlyHours = optNum(raw.preferredMonthlyHours);
  if (hourlyCost === undefined) fieldErrors.hourlyCost = msg.invalidNumber;
  if (dayRate === undefined) fieldErrors.dayRate = msg.invalidNumber;
  if (maxMonthlyHours === undefined || (maxMonthlyHours ?? 0) > 744) fieldErrors.maxMonthlyHours = msg.hoursRange;
  if (preferredMonthlyHours === undefined || (preferredMonthlyHours ?? 0) > 744) fieldErrors.preferredMonthlyHours = msg.hoursRange;

  const availableFromRaw = text(raw.availableFrom, 10);
  const availableFrom = availableFromRaw ? (/^\d{4}-\d{2}-\d{2}$/.test(availableFromRaw) && !Number.isNaN(Date.parse(availableFromRaw)) ? availableFromRaw : undefined) : null;
  if (availableFrom === undefined) fieldErrors.availableFrom = msg.invalidDate;

  const minimumEngagement = text(raw.minimumEngagement, 120);
  const commercialNotes = text(raw.commercialNotes, 2000);
  if (typeof raw.commercialNotes === "string" && raw.commercialNotes.length > 2000) fieldErrors.commercialNotes = msg.tooLong;

  if (Object.keys(fieldErrors).length) return { errors: { error: Object.values(fieldErrors)[0], fieldErrors } };

  return {
    data: {
      benchStatus: benchStatus as BenchDetailsInput["benchStatus"],
      availability: oneOf(raw.availability, ["available", "limited", "unavailable", "unknown"] as const) ?? null,
      availableFrom: availableFrom ?? null,
      maxMonthlyHours: maxMonthlyHours == null ? null : Math.round(maxMonthlyHours),
      preferredMonthlyHours: preferredMonthlyHours == null ? null : Math.round(preferredMonthlyHours),
      engagementType: oneOf(raw.engagementType, ENGAGEMENT_TYPES) ?? null,
      hourlyCost: hourlyCost ?? null,
      costCurrency: oneOf(raw.costCurrency, CURRENCIES) ?? null,
      dayRate: dayRate ?? null,
      minimumEngagement: minimumEngagement || null,
      commercialNotes: commercialNotes || null,
    },
  };
}
