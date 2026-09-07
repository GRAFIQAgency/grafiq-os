import { CURRENCIES } from "@/config/currencies";

import type { ActionResult, ContactInput, DealDetailsInput } from "./types";

export interface DealValidationMessages {
  invalidNumber: string;
  invalidDate: string;
  probabilityRange: string;
  tooLong: string;
  nameRequired: string;
  invalidEmail: string;
  invalidUrl: string;
}

type Outcome<T> = { data: T; errors?: undefined } | { data?: undefined; errors: ActionResult };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]) => (allowed.includes(v as T) ? (v as T) : undefined);
const optNum = (v: unknown): number | null | undefined => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : undefined; // undefined = invalid
};
const optDate = (v: unknown): string | null | undefined => {
  const s = text(v, 10);
  if (!s) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : undefined;
};
const optId = (v: unknown) => {
  const s = text(v, 64);
  return s || null;
};

export function validateDealDetails(raw: unknown, msg: DealValidationMessages): Outcome<DealDetailsInput> {
  if (!isRecord(raw)) return { errors: { error: msg.invalidNumber } };
  const fieldErrors: Record<string, string> = {};

  const dealValue = optNum(raw.dealValue);
  if (dealValue === undefined) fieldErrors.dealValue = msg.invalidNumber;

  const probability = optNum(raw.probability);
  if (probability === undefined || (probability ?? 0) > 100) fieldErrors.probability = msg.probabilityRange;

  const expectedClose = optDate(raw.expectedClose);
  if (expectedClose === undefined) fieldErrors.expectedClose = msg.invalidDate;
  const nextActionAt = optDate(raw.nextActionAt);
  if (nextActionAt === undefined) fieldErrors.nextActionAt = msg.invalidDate;

  if (typeof raw.nextStep === "string" && raw.nextStep.length > 500) fieldErrors.nextStep = msg.tooLong;

  if (Object.keys(fieldErrors).length) return { errors: { error: Object.values(fieldErrors)[0], fieldErrors } };

  return {
    data: {
      ownerId: optId(raw.ownerId),
      dealValue: dealValue ?? null,
      dealCurrency: oneOf(raw.dealCurrency, CURRENCIES) ?? null,
      probability: probability == null ? null : Math.round(probability),
      expectedClose: expectedClose ?? null,
      nextStep: text(raw.nextStep, 500) || null,
      nextActionAt: nextActionAt ?? null,
      pricingEstimateId: optId(raw.pricingEstimateId),
    },
  };
}

export function validateContact(raw: unknown, msg: DealValidationMessages): Outcome<ContactInput> {
  if (!isRecord(raw)) return { errors: { error: msg.nameRequired } };
  const fieldErrors: Record<string, string> = {};
  const name = text(raw.name, 120);
  if (!name) fieldErrors.name = msg.nameRequired;
  const email = text(raw.email, 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = msg.invalidEmail;
  const profileUrl = text(raw.profileUrl, 500);
  if (profileUrl && !/^https?:\/\//i.test(profileUrl)) fieldErrors.profileUrl = msg.invalidUrl;
  if (Object.keys(fieldErrors).length) return { errors: { error: Object.values(fieldErrors)[0], fieldErrors } };
  return {
    data: { name, jobTitle: text(raw.jobTitle, 120) || null, email: email || null, phone: text(raw.phone, 60) || null, profileUrl: profileUrl || null },
  };
}
