"use server";

import { getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/queries";
import type { FinancePayableRow } from "@/types/database";

import type { ActionResult } from "../types";
import { validatePayable } from "../validation";
import { fail, logProject, projectSnapshot, revalidateFinance } from "./shared";

export interface SaveResult extends ActionResult {
  id?: string;
}

export async function savePayable(id: string | null, raw: unknown): Promise<SaveResult> {
  const dict = await getDictionary();
  const v = validatePayable(raw, dict.finance.validation);
  if (v.errors) return v.errors;
  const d = v.data;
  const supabase = await createClient();
  const snap = await projectSnapshot(d.projectId);
  let payeeName = d.payeeName;
  if (d.talentCandidateId && !payeeName) {
    const { data } = await supabase.from("talent_candidates").select("full_name").eq("id", d.talentCandidateId).maybeSingle<{ full_name: string }>();
    payeeName = data?.full_name ?? null;
  }
  if (d.supplierId && !payeeName) {
    const { data } = await supabase.from("company_leads").select("name").eq("id", d.supplierId).maybeSingle<{ name: string }>();
    payeeName = data?.name ?? null;
  }
  const row = {
    label: d.label, amount: d.amount, currency: d.currency, due_date: d.dueDate, project_id: d.projectId, project_name: snap.project_name,
    talent_candidate_id: d.talentCandidateId, supplier_id: d.supplierId, payee_name: payeeName, category: d.category, notes: d.notes,
  };
  if (id) {
    const { data: existing } = await supabase.from("finance_payables").select("currency").eq("id", id).maybeSingle<Pick<FinancePayableRow, "currency">>();
    if (!existing) return { error: dict.finance.errors.notFound };
    const { error } = await supabase.from("finance_payables").update({ ...row, currency: existing.currency }).eq("id", id);
    if (error) return fail(error.message);
    revalidateFinance(d.projectId);
    return { id };
  }
  const user = await getCurrentUser();
  const { data, error } = await supabase.from("finance_payables").insert({ ...row, created_by: user?.user.id ?? null }).select("id").single<{ id: string }>();
  if (error || !data) return fail(error?.message);
  await logProject(d.projectId, "payable_created", { label: d.label, payee: payeeName ?? "—", amount: d.amount, currency: d.currency, due: d.dueDate });
  revalidateFinance(d.projectId);
  return { id: data.id };
}

export async function setPayableCancelled(id: string, cancelled: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("finance_payables").update({ status: cancelled ? "cancelled" : "open", cancelled_at: cancelled ? new Date().toISOString() : null }).eq("id", id).select("project_id").maybeSingle<{ project_id: string | null }>();
  if (error) return fail(error.message);
  revalidateFinance(data?.project_id);
  return {};
}

export async function deletePayable(id: string): Promise<ActionResult> {
  const dict = await getDictionary();
  const supabase = await createClient();
  const { count } = await supabase.from("finance_cash_events").select("id", { count: "exact", head: true }).eq("payable_id", id).is("voided_at", null);
  if (count) return { error: dict.finance.errors.hasPayments };
  const { data, error } = await supabase.from("finance_payables").delete().eq("id", id).select("project_id").maybeSingle<{ project_id: string | null }>();
  if (error) return fail(error.message);
  revalidateFinance(data?.project_id);
  return {};
}
