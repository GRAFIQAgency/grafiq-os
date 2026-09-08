"use server";

import { getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/queries";

import { isoToday } from "../calculations/dates";
import type { ActionResult } from "../types";
import { validateAccount } from "../validation";
import { fail, revalidateFinance } from "./shared";

export interface SaveResult extends ActionResult {
  id?: string;
}

/** Creates or updates a cash account. The balance is a manual management figure (with its as-of date). */
export async function saveAccount(id: string | null, raw: unknown): Promise<SaveResult> {
  const dict = await getDictionary();
  const v = validateAccount(raw, dict.finance.validation, isoToday());
  if (v.errors) return v.errors;
  const d = v.data;
  const supabase = await createClient();
  const row = { name: d.name, currency: d.currency, type: d.type, current_balance: d.currentBalance, balance_as_of: d.balanceAsOf, is_active: d.isActive, notes: d.notes };
  if (id) {
    const { error } = await supabase.from("finance_accounts").update(row).eq("id", id);
    if (error) return fail(error.message);
    revalidateFinance();
    return { id };
  }
  const user = await getCurrentUser();
  const { data, error } = await supabase.from("finance_accounts").insert({ ...row, created_by: user?.user.id ?? null }).select("id").single<{ id: string }>();
  if (error || !data) return fail(error?.message);
  revalidateFinance();
  return { id: data.id };
}

/** Quick balance update from the Cash flow page. */
export async function updateAccountBalance(id: string, raw: { currentBalance: unknown; balanceAsOf: unknown }): Promise<ActionResult> {
  const dict = await getDictionary();
  const balance = Number(String(raw.currentBalance ?? "").replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(balance)) return { fieldErrors: { currentBalance: dict.finance.validation.invalidNumber } };
  const asOf = typeof raw.balanceAsOf === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.balanceAsOf) ? raw.balanceAsOf : isoToday();
  const supabase = await createClient();
  const { error } = await supabase.from("finance_accounts").update({ current_balance: Math.round(balance * 100) / 100, balance_as_of: asOf }).eq("id", id);
  if (error) return fail(error.message);
  revalidateFinance();
  return {};
}

export async function setAccountActive(id: string, isActive: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("finance_accounts").update({ is_active: isActive }).eq("id", id);
  if (error) return fail(error.message);
  revalidateFinance();
  return {};
}
