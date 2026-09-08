"use server";

import { getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/queries";
import type { FinanceReceivableRow } from "@/types/database";

import { grossAmount } from "../calculations/schedule";
import type { ActionResult } from "../types";
import { validateReceivable, validateSchedule } from "../validation";
import { fail, logProject, projectSnapshot, revalidateFinance } from "./shared";

export interface SaveResult extends ActionResult {
  id?: string;
}

export async function saveReceivable(id: string | null, raw: unknown): Promise<SaveResult> {
  const dict = await getDictionary();
  const v = validateReceivable(raw, dict.finance.validation);
  if (v.errors) return v.errors;
  const d = v.data;
  const supabase = await createClient();
  const snap = await projectSnapshot(d.projectId);
  if (snap.currency && snap.currency !== d.currency) return { fieldErrors: { currency: dict.finance.errors.currencyMismatch } };
  const row = {
    project_id: d.projectId, project_name: snap.project_name, client_id: d.clientId ?? snap.client_id, client_name: d.clientName ?? snap.client_name, label: d.label,
    net_amount: d.netAmount, vat_rate: d.vatRate, amount: grossAmount(d.netAmount, d.vatRate), currency: d.currency, due_date: d.dueDate, expected_date: d.expectedDate,
    percent_of_contract: d.percentOfContract, invoice_reference: d.invoiceReference, invoice_sent_at: d.invoiceSentAt, notes: d.notes,
  };
  if (id) {
    const { data: existing } = await supabase.from("finance_receivables").select("currency, status").eq("id", id).maybeSingle<Pick<FinanceReceivableRow, "currency" | "status">>();
    if (!existing) return { error: dict.finance.errors.notFound };
    // Currency is locked once payments may reference it (cash events must match).
    const { error } = await supabase.from("finance_receivables").update({ ...row, currency: existing.currency }).eq("id", id);
    if (error) return fail(error.message);
    revalidateFinance(d.projectId);
    return { id };
  }
  const user = await getCurrentUser();
  const { data, error } = await supabase.from("finance_receivables").insert({ ...row, created_by: user?.user.id ?? null }).select("id").single<{ id: string }>();
  if (error || !data) return fail(error?.message);
  await logProject(d.projectId, "receivable_created", { label: d.label, amount: row.amount, currency: d.currency, due: d.dueDate });
  revalidateFinance(d.projectId);
  return { id: data.id };
}

/** Soft cancellation (waived / cancelled). The row and its payments stay auditable. */
export async function setReceivableCancelled(id: string, cancelled: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("finance_receivables").update({ status: cancelled ? "cancelled" : "open", cancelled_at: cancelled ? new Date().toISOString() : null }).eq("id", id).select("project_id").maybeSingle<{ project_id: string | null }>();
  if (error) return fail(error.message);
  revalidateFinance(data?.project_id);
  return {};
}

/** Hard delete only while nothing was paid against it; otherwise cancel. */
export async function deleteReceivable(id: string): Promise<ActionResult> {
  const dict = await getDictionary();
  const supabase = await createClient();
  const { count } = await supabase.from("finance_cash_events").select("id", { count: "exact", head: true }).eq("receivable_id", id).is("voided_at", null);
  if (count) return { error: dict.finance.errors.hasPayments };
  const { data, error } = await supabase.from("finance_receivables").delete().eq("id", id).select("project_id").maybeSingle<{ project_id: string | null }>();
  if (error) return fail(error.message);
  revalidateFinance(data?.project_id);
  return {};
}

/**
 * Writes the edited payment schedule as receivables of the project. A
 * SNAPSHOT: later Settings or change-request edits never touch these rows.
 */
export async function generatePaymentSchedule(projectId: string, raw: unknown): Promise<ActionResult> {
  const dict = await getDictionary();
  const v = validateSchedule(raw, dict.finance.validation);
  if (v.errors) return v.errors;
  const d = v.data;
  const supabase = await createClient();
  const snap = await projectSnapshot(projectId);
  if (!snap.currency) return { error: dict.finance.errors.notFound };
  const user = await getCurrentUser();
  const { count } = await supabase.from("finance_receivables").select("id", { count: "exact", head: true }).eq("project_id", projectId);
  const vat = d.applyVat ? d.vatRate : 0;
  const rows = d.lines.map((l, i) => ({
    project_id: projectId, project_name: snap.project_name, client_id: snap.client_id, client_name: snap.client_name, label: l.label,
    net_amount: l.netAmount, vat_rate: vat, amount: grossAmount(l.netAmount, vat), currency: snap.currency, due_date: l.dueDate, percent_of_contract: l.percent || null,
    position: (count ?? 0) + i, created_by: user?.user.id ?? null,
  }));
  const { error } = await supabase.from("finance_receivables").insert(rows);
  if (error) return fail(error.message);
  await logProject(projectId, "payment_schedule_generated", { instalments: rows.length, total: rows.reduce((s, r) => s + r.amount, 0), currency: snap.currency, vat: vat ? `${vat} %` : "none" });
  revalidateFinance(projectId);
  return {};
}
