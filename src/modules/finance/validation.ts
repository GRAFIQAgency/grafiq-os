/** Input validation for Finance forms. Pure: messages are passed in (dict.finance.validation). */
import { CURRENCIES } from "@/config/currencies";
import type { Currency } from "@/types/database";

import { ACCOUNT_TYPES, FREQUENCIES, PAYABLE_CATEGORIES, RECURRING_CATEGORIES } from "./constants";
import type { AccountInput, ActionResult, PayableInput, PaymentInput, ReceivableInput, RecurringCostInput, ScheduleInput } from "./types";

export interface FinanceValidationMessages {
  required: string;
  invalidNumber: string;
  invalidDate: string;
  invalidPercent: string;
  invalidCurrency: string;
  tooLong: string;
  noLines: string;
}

type Outcome<T> = { data: T; errors?: undefined } | { data?: undefined; errors: ActionResult };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const bool = (v: unknown) => v === true || v === "true" || v === "on" || v === "1";
const ISO = /^\d{4}-\d{2}-\d{2}$/;
/** undefined = invalid, null = empty. */
const optDate = (v: unknown): string | null | undefined => (v == null || v === "" ? null : typeof v === "string" && ISO.test(v) ? v : undefined);
const optNum = (v: unknown): number | null | undefined => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};
const optId = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const currencyOf = (v: unknown): Currency | undefined => CURRENCIES.find((c) => c === v);
const fail = (fieldErrors: Record<string, string>): { errors: ActionResult } => ({ errors: { fieldErrors } });

export function validateAccount(raw: unknown, msg: FinanceValidationMessages, today: string): Outcome<AccountInput> {
  if (!isRecord(raw)) return fail({ name: msg.required });
  const e: Record<string, string> = {};
  const name = text(raw.name, 100);
  if (!name) e.name = msg.required;
  const currency = currencyOf(raw.currency);
  if (!currency) e.currency = msg.invalidCurrency;
  const balance = raw.currentBalance == null || raw.currentBalance === "" ? 0 : Number(String(raw.currentBalance).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(balance)) e.currentBalance = msg.invalidNumber;
  const asOf = optDate(raw.balanceAsOf);
  if (asOf === undefined) e.balanceAsOf = msg.invalidDate;
  if (Object.keys(e).length) return fail(e);
  return {
    data: {
      name, currency: currency as Currency, type: ACCOUNT_TYPES.find((t) => t === raw.type) ?? "bank", currentBalance: Math.round(balance * 100) / 100,
      balanceAsOf: asOf ?? today, isActive: raw.isActive === undefined ? true : bool(raw.isActive), notes: text(raw.notes, 1000) || null,
    },
  };
}

export function validateReceivable(raw: unknown, msg: FinanceValidationMessages): Outcome<ReceivableInput> {
  if (!isRecord(raw)) return fail({ label: msg.required });
  const e: Record<string, string> = {};
  const label = text(raw.label, 200);
  if (!label) e.label = msg.required;
  const netAmount = optNum(raw.netAmount);
  if (netAmount == null) e.netAmount = msg.invalidNumber;
  const vatRate = raw.vatRate == null || raw.vatRate === "" ? 0 : optNum(raw.vatRate);
  if (vatRate == null || vatRate > 100) e.vatRate = msg.invalidPercent;
  const currency = currencyOf(raw.currency);
  if (!currency) e.currency = msg.invalidCurrency;
  const dueDate = optDate(raw.dueDate);
  if (!dueDate) e.dueDate = msg.invalidDate;
  const expectedDate = optDate(raw.expectedDate);
  if (expectedDate === undefined) e.expectedDate = msg.invalidDate;
  const invoiceSentAt = optDate(raw.invoiceSentAt);
  if (invoiceSentAt === undefined) e.invoiceSentAt = msg.invalidDate;
  const percent = optNum(raw.percentOfContract);
  if (percent === undefined || (percent != null && percent > 100)) e.percentOfContract = msg.invalidPercent;
  if (Object.keys(e).length) return fail(e);
  return {
    data: {
      projectId: optId(raw.projectId), clientId: optId(raw.clientId), clientName: text(raw.clientName, 200) || null, label,
      netAmount: netAmount as number, vatRate: vatRate as number, currency: currency as Currency, dueDate: dueDate as string, expectedDate: expectedDate ?? null,
      percentOfContract: percent ?? null, invoiceReference: text(raw.invoiceReference, 100) || null, invoiceSentAt: invoiceSentAt ?? null, notes: text(raw.notes, 2000) || null,
    },
  };
}

export function validatePayable(raw: unknown, msg: FinanceValidationMessages): Outcome<PayableInput> {
  if (!isRecord(raw)) return fail({ label: msg.required });
  const e: Record<string, string> = {};
  const label = text(raw.label, 200);
  if (!label) e.label = msg.required;
  const amount = optNum(raw.amount);
  if (amount == null) e.amount = msg.invalidNumber;
  const currency = currencyOf(raw.currency);
  if (!currency) e.currency = msg.invalidCurrency;
  const dueDate = optDate(raw.dueDate);
  if (!dueDate) e.dueDate = msg.invalidDate;
  if (Object.keys(e).length) return fail(e);
  return {
    data: {
      label, amount: amount as number, currency: currency as Currency, dueDate: dueDate as string, projectId: optId(raw.projectId), talentCandidateId: optId(raw.talentCandidateId),
      supplierId: optId(raw.supplierId), payeeName: text(raw.payeeName, 200) || null, category: PAYABLE_CATEGORIES.find((c) => c === raw.category) ?? "other", notes: text(raw.notes, 2000) || null,
    },
  };
}

export function validateRecurringCost(raw: unknown, msg: FinanceValidationMessages): Outcome<RecurringCostInput> {
  if (!isRecord(raw)) return fail({ name: msg.required });
  const e: Record<string, string> = {};
  const name = text(raw.name, 120);
  if (!name) e.name = msg.required;
  const amount = optNum(raw.amount);
  if (amount == null) e.amount = msg.invalidNumber;
  const currency = currencyOf(raw.currency);
  if (!currency) e.currency = msg.invalidCurrency;
  const nextDueDate = optDate(raw.nextDueDate);
  if (!nextDueDate) e.nextDueDate = msg.invalidDate;
  if (Object.keys(e).length) return fail(e);
  return {
    data: {
      name, category: RECURRING_CATEGORIES.find((c) => c === raw.category) ?? "other", amount: amount as number, currency: currency as Currency,
      frequency: FREQUENCIES.find((f) => f === raw.frequency) ?? "monthly", nextDueDate: nextDueDate as string, isActive: raw.isActive === undefined ? true : bool(raw.isActive), notes: text(raw.notes, 1000) || null,
    },
  };
}

export function validatePayment(raw: unknown, msg: FinanceValidationMessages, today: string): Outcome<PaymentInput> {
  if (!isRecord(raw)) return fail({ amount: msg.invalidNumber });
  const e: Record<string, string> = {};
  const amount = optNum(raw.amount);
  if (amount == null || amount <= 0) e.amount = msg.invalidNumber;
  const occurredAt = optDate(raw.occurredAt);
  if (occurredAt === undefined) e.occurredAt = msg.invalidDate;
  if (Object.keys(e).length) return fail(e);
  return { data: { amount: amount as number, occurredAt: occurredAt ?? today, accountId: optId(raw.accountId), note: text(raw.note, 500) || null } };
}

/** Generated schedule as edited by the user: labels, percents, net amounts and due dates per line. */
export function validateSchedule(raw: unknown, msg: FinanceValidationMessages): Outcome<ScheduleInput> {
  if (!isRecord(raw) || !Array.isArray(raw.lines)) return fail({ lines: msg.noLines });
  const e: Record<string, string> = {};
  const vatRate = raw.vatRate == null || raw.vatRate === "" ? 0 : optNum(raw.vatRate);
  if (vatRate == null || vatRate > 100) e.vatRate = msg.invalidPercent;
  const lines: ScheduleInput["lines"] = [];
  raw.lines.forEach((l, i) => {
    if (!isRecord(l)) return;
    const label = text(l.label, 200);
    const netAmount = optNum(l.netAmount);
    const percent = optNum(l.percent);
    const dueDate = optDate(l.dueDate);
    if (!label) e[`lines.${i}.label`] = msg.required;
    if (netAmount == null) e[`lines.${i}.netAmount`] = msg.invalidNumber;
    if (!dueDate) e[`lines.${i}.dueDate`] = msg.invalidDate;
    lines.push({ label, percent: percent ?? 0, netAmount: netAmount ?? 0, dueDate: dueDate ?? "" });
  });
  if (!lines.length) e.lines = msg.noLines;
  if (Object.keys(e).length) return fail(e);
  return { data: { applyVat: bool(raw.applyVat), vatRate: vatRate as number, lines } };
}
