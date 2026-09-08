"use server";

import { revalidatePath } from "next/cache";

import { getModule } from "@/config/modules";
import { interpolate } from "@/lib/i18n/interpolate";
import { getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/queries";

import type { EstimateInput, SaveEstimateResult } from "./types";
import { validateEstimateInput } from "./validation";

function toItemRows(estimateId: string, estimate: EstimateInput) {
  return estimate.items.map((item, position) => ({
    estimate_id: estimateId,
    name: item.name,
    kind: item.kind,
    hours: item.hours,
    hourly_rate: item.hourlyRate,
    fixed_amount: item.fixedAmount,
    percent: item.percent,
    quantity: item.quantity,
    unit_cost: item.unitCost,
    unit_label: item.unitLabel,
    position,
  }));
}

/**
 * Creates or updates an estimate together with its cost items.
 * v1 note: the writes are sequential, not a single transaction. For an
 * internal tool with a handful of users this is acceptable; move to a
 * Postgres function if it ever becomes a problem.
 */
export async function saveEstimate(raw: unknown): Promise<SaveEstimateResult> {
  const dict = await getDictionary();
  const errors = dict.pricing.errors;

  const validated = validateEstimateInput(raw, dict.pricing.validation);
  if (validated.errors) return validated.errors;
  const estimate = validated.data;

  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: errors.mustSignIn };

  const supabase = await createClient();
  const estimateRow = {
    project_name: estimate.projectName,
    client_name: estimate.clientName || null,
    currency: estimate.currency,
    revenue: estimate.revenue,
    target_margin: estimate.targetMargin,
    pricing_basis: estimate.pricingBasis,
    unit_count: estimate.unitCount,
    unit_price: estimate.unitPrice,
    unit_label: estimate.unitLabel,
  };

  let estimateId = estimate.id;

  if (estimateId) {
    const { error } = await supabase.from("pricing_estimates").update(estimateRow).eq("id", estimateId);
    if (error) return { error: interpolate(errors.updateFailed, { message: error.message }) };

    const { error: deleteError } = await supabase
      .from("pricing_cost_items")
      .delete()
      .eq("estimate_id", estimateId);
    if (deleteError) {
      return { error: interpolate(errors.replaceItemsFailed, { message: deleteError.message }) };
    }
  } else {
    const { data, error } = await supabase
      .from("pricing_estimates")
      .insert({ ...estimateRow, created_by: currentUser.user.id })
      .select("id")
      .single<{ id: string }>();
    if (error || !data) {
      return { error: interpolate(errors.saveFailed, { message: error?.message ?? "unknown error" }) };
    }
    estimateId = data.id;
  }

  if (estimate.items.length > 0) {
    const { error } = await supabase.from("pricing_cost_items").insert(toItemRows(estimateId, estimate));
    if (error) return { error: interpolate(errors.itemsFailed, { message: error.message }) };
  }

  revalidatePath(getModule("pricing").href);
  return { id: estimateId };
}
