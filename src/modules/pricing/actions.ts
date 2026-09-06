"use server";

import { revalidatePath } from "next/cache";

import { getModule } from "@/config/modules";
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
  const validated = validateEstimateInput(raw);
  if (validated.errors) return validated.errors;
  const estimate = validated.data;

  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: "You must be signed in to save an estimate." };

  const supabase = await createClient();
  const estimateRow = {
    project_name: estimate.projectName,
    client_name: estimate.clientName || null,
    currency: estimate.currency,
    revenue: estimate.revenue,
    target_margin: estimate.targetMargin,
  };

  let estimateId = estimate.id;

  if (estimateId) {
    const { error } = await supabase.from("pricing_estimates").update(estimateRow).eq("id", estimateId);
    if (error) return { error: `Could not update estimate: ${error.message}` };

    const { error: deleteError } = await supabase
      .from("pricing_cost_items")
      .delete()
      .eq("estimate_id", estimateId);
    if (deleteError) return { error: `Could not replace cost items: ${deleteError.message}` };
  } else {
    const { data, error } = await supabase
      .from("pricing_estimates")
      .insert({ ...estimateRow, created_by: currentUser.user.id })
      .select("id")
      .single<{ id: string }>();
    if (error || !data) return { error: `Could not save estimate: ${error?.message ?? "unknown error"}` };
    estimateId = data.id;
  }

  if (estimate.items.length > 0) {
    const { error } = await supabase.from("pricing_cost_items").insert(toItemRows(estimateId, estimate));
    if (error) return { error: `Estimate saved, but cost items failed: ${error.message}` };
  }

  revalidatePath(getModule("pricing").href);
  return { id: estimateId };
}
