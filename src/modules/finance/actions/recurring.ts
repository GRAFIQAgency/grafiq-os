"use server";

import { getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/queries";

import type { ActionResult } from "../types";
import { validateRecurringCost } from "../validation";
import { fail, revalidateFinance } from "./shared";

export interface SaveResult extends ActionResult {
  id?: string;
}

export async function saveRecurringCost(id: string | null, raw: unknown): Promise<SaveResult> {
  const dict = await getDictionary();
  const v = validateRecurringCost(raw, dict.finance.validation);
  if (v.errors) return v.errors;
  const d = v.data;
  const supabase = await createClient();
  const row = { name: d.name, category: d.category, amount: d.amount, currency: d.currency, frequency: d.frequency, next_due_date: d.nextDueDate, is_active: d.isActive, notes: d.notes };
  if (id) {
    const { data: existing } = await supabase.from("finance_recurring_costs").select("currency").eq("id", id).maybeSingle<{ currency: string }>();
    if (!existing) return { error: dict.finance.errors.notFound };
    const { error } = await supabase.from("finance_recurring_costs").update({ ...row, currency: existing.currency }).eq("id", id);
    if (error) return fail(error.message);
    revalidateFinance();
    return { id };
  }
  const user = await getCurrentUser();
  const { data, error } = await supabase.from("finance_recurring_costs").insert({ ...row, created_by: user?.user.id ?? null }).select("id").single<{ id: string }>();
  if (error || !data) return fail(error?.message);
  revalidateFinance();
  return { id: data.id };
}

export async function setRecurringActive(id: string, isActive: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("finance_recurring_costs").update({ is_active: isActive }).eq("id", id);
  if (error) return fail(error.message);
  revalidateFinance();
  return {};
}

/** Delete only while no payment references the definition; otherwise deactivate. */
export async function deleteRecurringCost(id: string): Promise<ActionResult> {
  const dict = await getDictionary();
  const supabase = await createClient();
  const { count } = await supabase.from("finance_cash_events").select("id", { count: "exact", head: true }).eq("recurring_cost_id", id);
  if (count) return { error: dict.finance.errors.hasPayments };
  const { error } = await supabase.from("finance_recurring_costs").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidateFinance();
  return {};
}
