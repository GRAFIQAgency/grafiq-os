"use server";

import { revalidatePath } from "next/cache";

import { getModule } from "@/config/modules";
import { interpolate } from "@/lib/i18n/interpolate";
import { getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

import type { ActionResult, SaveRoleCostResult } from "./types";
import { validateBusinessSettings, validateRoleCost } from "./validation";

/** Postgres error codes we translate into friendly messages. */
const PG_UNIQUE_VIOLATION = "23505";
const PG_FOREIGN_KEY_VIOLATION = "23503";

function revalidateSettings() {
  revalidatePath(getModule("settings").href);
}

export async function saveBusinessSettings(raw: unknown): Promise<ActionResult> {
  const dict = await getDictionary();
  const validated = validateBusinessSettings(raw, dict.settings.validation);
  if (validated.errors) return validated.errors;
  const s = validated.data;

  const supabase = await createClient();
  const { error } = await supabase.from("business_settings").upsert({
    id: 1,
    company_name: s.companyName,
    default_currency: s.defaultCurrency,
    vat_rate: s.vatRate,
    target_margin: s.targetMargin,
    warning_margin: s.warningMargin,
    minimum_margin: s.minimumMargin,
    payment_terms: s.paymentTerms,
  });
  if (error) return { error: interpolate(dict.settings.errors.saveFailed, { message: error.message }) };

  revalidateSettings();
  return {};
}

export async function saveRoleCost(raw: unknown): Promise<SaveRoleCostResult> {
  const dict = await getDictionary();
  const validated = validateRoleCost(raw, dict.settings.validation);
  if (validated.errors) return validated.errors;
  const role = validated.data;

  const supabase = await createClient();
  const row = {
    name: role.name,
    hourly_cost: role.hourlyCost,
    currency: role.currency,
    is_active: role.isActive,
  };

  let id = role.id;
  if (id) {
    const { error } = await supabase.from("role_costs").update(row).eq("id", id);
    if (error) return roleError(error, dict.settings);
  } else {
    // Append at the end of the list.
    const { data: last } = await supabase
      .from("role_costs")
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle<{ position: number }>();
    const position = (last?.position ?? -1) + 1;

    const { data, error } = await supabase
      .from("role_costs")
      .insert({ ...row, position })
      .select("id")
      .single<{ id: string }>();
    if (error || !data) return roleError(error, dict.settings);
    id = data.id;
  }

  revalidateSettings();
  return { id };
}

export async function setRoleCostActive(id: string, isActive: boolean): Promise<ActionResult> {
  const dict = await getDictionary();
  const supabase = await createClient();
  const { error } = await supabase.from("role_costs").update({ is_active: isActive }).eq("id", id);
  if (error) return roleError(error, dict.settings);
  revalidateSettings();
  return {};
}

/** Deletes a role. Fails with a friendly message if another table references it. */
export async function deleteRoleCost(id: string): Promise<ActionResult> {
  const dict = await getDictionary();
  const supabase = await createClient();
  const { error } = await supabase.from("role_costs").delete().eq("id", id);
  if (error) {
    if (error.code === PG_FOREIGN_KEY_VIOLATION) return { error: dict.settings.errors.roleReferenced };
    return { error: interpolate(dict.settings.errors.roleDeleteFailed, { message: error.message }) };
  }
  revalidateSettings();
  return {};
}

function roleError(
  error: { code?: string; message: string } | null,
  text: { errors: { roleSaveFailed: string }; validation: { roleNameTaken: string } }
): ActionResult {
  if (error?.code === PG_UNIQUE_VIOLATION) {
    return { error: text.validation.roleNameTaken, fieldErrors: { name: text.validation.roleNameTaken } };
  }
  return { error: interpolate(text.errors.roleSaveFailed, { message: error?.message ?? "unknown error" }) };
}
