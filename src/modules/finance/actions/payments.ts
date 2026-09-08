"use server";

import { CURRENCIES } from "@/config/currencies";
import { getDictionary } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/interpolate";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/queries";
import type { FinanceCashEventRow, FinancePayableRow, FinanceReceivableRow, FinanceRecurringCostRow } from "@/types/database";

import { isoToday } from "../calculations/dates";
import { nextDueAfterPayment } from "../calculations/recurring";
import { paymentAllowed, sumEvents } from "../calculations/status";
import type { ActionResult } from "../types";
import { validatePayment } from "../validation";
import { fail, logProject, revalidateFinance } from "./shared";

type EventInsert = Omit<FinanceCashEventRow, "id" | "created_at" | "voided_at" | "void_reason">;

async function insertEvent(row: EventInsert): Promise<string | undefined> {
  const supabase = await createClient();
  const { error } = await supabase.from("finance_cash_events").insert(row);
  return error?.message;
}

async function settled(column: "receivable_id" | "payable_id", id: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.from("finance_cash_events").select("amount, voided_at").eq(column, id).returns<{ amount: number; voided_at: string | null }[]>();
  return sumEvents((data ?? []).map((e) => ({ amount: Number(e.amount), voidedAt: e.voided_at })));
}

async function paymentError(check: ReturnType<typeof paymentAllowed>, currency: string): Promise<ActionResult | null> {
  if (check.ok) return null;
  const dict = await getDictionary();
  const e = dict.finance.errors;
  if (check.reason === "cancelled") return { error: e.itemCancelled };
  if (check.reason === "not_positive") return { fieldErrors: { amount: dict.finance.validation.invalidNumber } };
  return { fieldErrors: { amount: interpolate(e.exceedsOutstanding, { amount: `${check.outstanding} ${currency}` }) } };
}

/** Client paid (part of) a receivable → IN cash event. Partial payments accumulate; never above the outstanding amount. */
export async function recordReceivablePayment(receivableId: string, raw: unknown): Promise<ActionResult> {
  const dict = await getDictionary();
  const v = validatePayment(raw, dict.finance.validation, isoToday());
  if (v.errors) return v.errors;
  const supabase = await createClient();
  const { data: r } = await supabase.from("finance_receivables").select("*").eq("id", receivableId).maybeSingle<FinanceReceivableRow>();
  if (!r) return { error: dict.finance.errors.notFound };
  const check = paymentAllowed({ state: r.status, amount: Number(r.amount) }, await settled("receivable_id", receivableId), v.data.amount);
  const err = await paymentError(check, r.currency);
  if (err) return err;
  const user = await getCurrentUser();
  const msg = await insertEvent({
    direction: "in", amount: v.data.amount, currency: r.currency, occurred_at: v.data.occurredAt, account_id: v.data.accountId, receivable_id: r.id, payable_id: null, recurring_cost_id: null,
    label: [r.client_name, r.label].filter(Boolean).join(" · ") || r.label, note: v.data.note, created_by: user?.user.id ?? null,
  });
  if (msg) return fail(msg);
  await logProject(r.project_id, "payment_received", { label: r.label, amount: v.data.amount, currency: r.currency, date: v.data.occurredAt });
  revalidateFinance(r.project_id);
  return {};
}

/** We paid (part of) a payable → OUT cash event. */
export async function recordPayablePayment(payableId: string, raw: unknown): Promise<ActionResult> {
  const dict = await getDictionary();
  const v = validatePayment(raw, dict.finance.validation, isoToday());
  if (v.errors) return v.errors;
  const supabase = await createClient();
  const { data: p } = await supabase.from("finance_payables").select("*").eq("id", payableId).maybeSingle<FinancePayableRow>();
  if (!p) return { error: dict.finance.errors.notFound };
  const check = paymentAllowed({ state: p.status, amount: Number(p.amount) }, await settled("payable_id", payableId), v.data.amount);
  const err = await paymentError(check, p.currency);
  if (err) return err;
  const user = await getCurrentUser();
  const msg = await insertEvent({
    direction: "out", amount: v.data.amount, currency: p.currency, occurred_at: v.data.occurredAt, account_id: v.data.accountId, receivable_id: null, payable_id: p.id, recurring_cost_id: null,
    label: [p.payee_name, p.label].filter(Boolean).join(" · ") || p.label, note: v.data.note, created_by: user?.user.id ?? null,
  });
  if (msg) return fail(msg);
  await logProject(p.project_id, "payment_sent", { label: p.label, payee: p.payee_name ?? "—", amount: v.data.amount, currency: p.currency, date: v.data.occurredAt });
  revalidateFinance(p.project_id);
  return {};
}

/** Recurring cost paid → OUT cash event for the current occurrence and next_due_date advanced (no double count). */
export async function recordRecurringPayment(costId: string, raw: unknown): Promise<ActionResult> {
  const dict = await getDictionary();
  const v = validatePayment(raw, dict.finance.validation, isoToday());
  if (v.errors) return v.errors;
  const supabase = await createClient();
  const { data: c } = await supabase.from("finance_recurring_costs").select("*").eq("id", costId).maybeSingle<FinanceRecurringCostRow>();
  if (!c) return { error: dict.finance.errors.notFound };
  const user = await getCurrentUser();
  const msg = await insertEvent({
    direction: "out", amount: v.data.amount, currency: c.currency, occurred_at: v.data.occurredAt, account_id: v.data.accountId, receivable_id: null, payable_id: null, recurring_cost_id: c.id,
    label: c.name, note: v.data.note, created_by: user?.user.id ?? null,
  });
  if (msg) return fail(msg);
  const { error } = await supabase.from("finance_recurring_costs").update({ next_due_date: nextDueAfterPayment(c.next_due_date, c.frequency) }).eq("id", c.id);
  if (error) return fail(error.message);
  revalidateFinance();
  return {};
}

/** A cash movement without a receivable / payable (VAT payment, owner transfer, bank fee…). */
export async function recordCashEvent(raw: unknown): Promise<ActionResult> {
  const dict = await getDictionary();
  const v = validatePayment(raw, dict.finance.validation, isoToday());
  if (v.errors) return v.errors;
  const r = (typeof raw === "object" && raw ? raw : {}) as Record<string, unknown>;
  const direction = r.direction === "in" ? "in" : "out";
  const currency = CURRENCIES.find((c) => c === r.currency);
  const label = typeof r.label === "string" ? r.label.trim().slice(0, 200) : "";
  const e: Record<string, string> = {};
  if (!currency) e.currency = dict.finance.validation.invalidCurrency;
  if (!label) e.label = dict.finance.validation.required;
  if (Object.keys(e).length) return { fieldErrors: e };
  const user = await getCurrentUser();
  const msg = await insertEvent({
    direction, amount: v.data.amount, currency: currency as "CZK", occurred_at: v.data.occurredAt, account_id: v.data.accountId, receivable_id: null, payable_id: null, recurring_cost_id: null,
    label, note: v.data.note, created_by: user?.user.id ?? null,
  });
  if (msg) return fail(msg);
  revalidateFinance();
  return {};
}

/** Controlled correction: a wrong event is voided (kept, flagged), never deleted. */
export async function voidCashEvent(id: string, reason: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: ev } = await supabase.from("finance_cash_events").select("recurring_cost_id, voided_at").eq("id", id).maybeSingle<Pick<FinanceCashEventRow, "recurring_cost_id" | "voided_at">>();
  if (!ev || ev.voided_at) return {};
  const { error } = await supabase.from("finance_cash_events").update({ voided_at: new Date().toISOString(), void_reason: reason.trim().slice(0, 300) || null }).eq("id", id);
  if (error) return fail(error.message);
  // The recurring occurrence is unpaid again: step next_due_date back one period.
  if (ev.recurring_cost_id) {
    const { data: c } = await supabase.from("finance_recurring_costs").select("*").eq("id", ev.recurring_cost_id).maybeSingle<FinanceRecurringCostRow>();
    if (c) {
      const back = { monthly: -1, quarterly: -3, yearly: -12 }[c.frequency];
      const { addMonths } = await import("../calculations/dates");
      await supabase.from("finance_recurring_costs").update({ next_due_date: addMonths(c.next_due_date, back) }).eq("id", c.id);
    }
  }
  revalidateFinance();
  return {};
}
