import { CURRENCIES } from "@/config/currencies";

import { BENCH_STATUSES, ENGAGEMENT_TYPES, PRICING_MODELS } from "./constants";
import type { ActionResult, BenchDetailsInput, PersonRateInput } from "./types";

export interface BenchValidationMessages {
  invalidNumber: string;
  invalidDate: string;
  hoursRange: string;
  invalidStatus: string;
  tooLong: string;
  nameRequired: string;
  percentRange: string;
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

  const fixedPrice = optNum(raw.fixedPrice);
  if (fixedPrice === undefined) fieldErrors.fixedPrice = msg.invalidNumber;
  const marginPercent = optNum(raw.marginPercent);
  if (marginPercent === undefined || (marginPercent ?? 0) > 100) fieldErrors.marginPercent = msg.percentRange;

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
      pricingModel: oneOf(raw.pricingModel, PRICING_MODELS) ?? "hourly",
      fixedPrice: fixedPrice ?? null,
      marginPercent: marginPercent ?? null,
    },
  };
}

type RateOutcome = { data: PersonRateInput; errors?: undefined } | { data?: undefined; errors: ActionResult };

/** Settings → People rates: name (new people only), role, hourly cost, currency. */
export function validatePersonRate(raw: unknown, msg: BenchValidationMessages, options: { requireName: boolean }): RateOutcome {
  if (!isRecord(raw)) return { errors: { error: msg.invalidNumber } };
  const fieldErrors: Record<string, string> = {};
  const fullName = text(raw.fullName, 200);
  if (options.requireName && !fullName) fieldErrors.fullName = msg.nameRequired;
  const hourlyCost = optNum(raw.hourlyCost);
  if (hourlyCost === undefined) fieldErrors.hourlyCost = msg.invalidNumber;
  const fixedPrice = optNum(raw.fixedPrice);
  if (fixedPrice === undefined) fieldErrors.fixedPrice = msg.invalidNumber;
  const marginPercent = optNum(raw.marginPercent);
  if (marginPercent === undefined || (marginPercent ?? 0) > 100) fieldErrors.marginPercent = msg.percentRange;
  if (Object.keys(fieldErrors).length) return { errors: { error: Object.values(fieldErrors)[0], fieldErrors } };
  return {
    data: {
      fullName: fullName || undefined,
      role: text(raw.role, 100) || null,
      pricingModel: oneOf(raw.pricingModel, PRICING_MODELS) ?? "hourly",
      hourlyCost: hourlyCost ?? null,
      costCurrency: oneOf(raw.costCurrency, CURRENCIES) ?? null,
      fixedPrice: fixedPrice ?? null,
      marginPercent: marginPercent ?? null,
    },
  };
}
