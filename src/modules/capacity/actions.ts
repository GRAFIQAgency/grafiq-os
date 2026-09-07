"use server";

import { revalidatePath } from "next/cache";

import { getModule } from "@/config/modules";
import { getDictionary } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/interpolate";
import { createClient } from "@/lib/supabase/server";

import type { ActionResult } from "./types";
import { validateInternalCapacity } from "./validation";

/**
 * The only write in the Capacity module: monthly capacity of an INTERNAL user
 * (profile_capacity_details, 1:1 with profiles). Talent Bench capacity is
 * edited in Talent; everything else in Capacity is derived.
 */
export async function saveInternalCapacity(profileId: string, raw: unknown): Promise<ActionResult> {
  const dict = await getDictionary();
  const validated = validateInternalCapacity(raw, dict.capacity.validation);
  if (validated.errors) return validated.errors;
  const d = validated.data;

  const supabase = await createClient();
  const { error } = await supabase.from("profile_capacity_details").upsert({
    profile_id: profileId,
    monthly_capacity_hours: d.monthlyCapacityHours,
    preferred_monthly_hours: d.preferredMonthlyHours,
    capacity_active: d.capacityActive,
    notes: d.notes,
  });
  if (error) return { error: interpolate(dict.capacity.errors.saveFailed, { message: error.message }) };
  revalidatePath(getModule("capacity").href, "layout");
  return {};
}
