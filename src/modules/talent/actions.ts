"use server";

import { revalidatePath } from "next/cache";

import { getModule } from "@/config/modules";
import { getDictionary } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/interpolate";
import { createClient } from "@/lib/supabase/server";
import { manualConnector } from "@/modules/sourcing/connectors/manual";
import { currentActor } from "@/modules/sourcing/services/actor";
import { logActivity } from "@/modules/sourcing/services/activity";
import { markInTalentBench } from "@/modules/sourcing/services/bench";
import { ingestTalent } from "@/modules/sourcing/services/ingest";
import { validateTalentInput } from "@/modules/sourcing/services/talent-input";

import { archiveTransition, restoreTransition } from "./services/bench";
import type { ActionResult, PersonRateInput } from "./types";
import { validateBenchDetails, validatePersonRate } from "./validation";

function revalidateTalent() {
  revalidatePath(getModule("talent").href, "layout");
  revalidatePath(getModule("sourcing").href, "layout");
  revalidatePath(getModule("settings").href);
  revalidatePath(getModule("pricing").href);
}

async function fail(message: string): Promise<ActionResult> {
  const dict = await getDictionary();
  return { error: interpolate(dict.talent.errors.saveFailed, { message }) };
}

/** Saves operational fields (bench details) + the shared availability field. Creates the details row lazily. */
export async function saveBenchDetails(id: string, raw: unknown): Promise<ActionResult> {
  const dict = await getDictionary();
  const validated = validateBenchDetails(raw, dict.talent.validation);
  if (validated.errors) return validated.errors;
  const d = validated.data;

  const supabase = await createClient();
  const actor = await currentActor();

  const { error } = await supabase.from("talent_bench_details").upsert({
    talent_candidate_id: id,
    bench_status: d.benchStatus,
    engagement_type: d.engagementType,
    hourly_cost: d.hourlyCost,
    cost_currency: d.costCurrency,
    day_rate: d.dayRate,
    minimum_engagement: d.minimumEngagement,
    commercial_notes: d.commercialNotes,
    available_from: d.availableFrom,
    max_monthly_hours: d.maxMonthlyHours,
    preferred_monthly_hours: d.preferredMonthlyHours,
    pricing_model: d.pricingModel,
    fixed_price: d.fixedPrice,
    margin_percent: d.marginPercent,
  });
  if (error) return fail(error.message);

  // Availability is a shared person field (Sourcing shows it too); keep one source of truth.
  const inBench = d.benchStatus !== "archived";
  const { error: candidateError } = await supabase
    .from("talent_candidates")
    .update({ availability: d.availability, in_talent_bench: inBench })
    .eq("id", id);
  if (candidateError) return fail(candidateError.message);

  await logActivity(supabase, [{ entityType: "talent", entityId: id, action: "status_changed", details: { benchStatus: d.benchStatus, availability: d.availability } }], actor);
  revalidateTalent();
  return {};
}

/** Leaves the bench. Person, sourcing history, notes and bench details all stay. */
export async function archiveFromBench(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const actor = await currentActor();
  const t = archiveTransition();
  const { error } = await supabase.from("talent_bench_details").upsert({ talent_candidate_id: id, ...t.details });
  if (error) return fail(error.message);
  const { error: e2 } = await supabase.from("talent_candidates").update(t.candidate).eq("id", id);
  if (e2) return fail(e2.message);
  await logActivity(supabase, [{ entityType: "talent", entityId: id, action: "status_changed", details: { benchStatus: "archived" } }], actor);
  revalidateTalent();
  return {};
}

export async function restoreToBench(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const actor = await currentActor();
  const t = restoreTransition();
  const { error } = await supabase.from("talent_bench_details").upsert({ talent_candidate_id: id, ...t.details });
  if (error) return fail(error.message);
  const { error: e2 } = await supabase.from("talent_candidates").update({ ...t.candidate, bench_added_at: new Date().toISOString() }).eq("id", id);
  if (e2) return fail(e2.message);
  await logActivity(supabase, [{ entityType: "talent", entityId: id, action: "saved_to_bench" }], actor);
  revalidateTalent();
  return {};
}

/**
 * Settings → People rates: edits only the person's role and hourly cost
 * (the same shared fields the Talent detail page edits). Other bench details
 * are untouched because the upsert carries only these columns.
 */
export async function setPersonRate(id: string, raw: unknown): Promise<ActionResult> {
  const dict = await getDictionary();
  const validated = validatePersonRate(raw, dict.talent.validation, { requireName: false });
  if (validated.errors) return validated.errors;
  const d = validated.data;

  const supabase = await createClient();
  const actor = await currentActor();
  const { error } = await supabase.from("talent_bench_details").upsert({
    talent_candidate_id: id, pricing_model: d.pricingModel, hourly_cost: d.hourlyCost, cost_currency: d.costCurrency, fixed_price: d.fixedPrice, margin_percent: d.marginPercent,
  });
  if (error) return fail(error.message);
  const { error: e2 } = await supabase.from("talent_candidates").update({ role: d.role }).eq("id", id);
  if (e2) return fail(e2.message);
  await logActivity(supabase, [{ entityType: "talent", entityId: id, action: "status_changed", details: { payModel: d.pricingModel, hourlyCost: d.hourlyCost, fixedPrice: d.fixedPrice, marginPercent: d.marginPercent, currency: d.costCurrency, role: d.role } }], actor);
  revalidateTalent();
  revalidatePath(getModule("settings").href);
  revalidatePath(getModule("pricing").href);
  return {};
}

/** Settings → People rates → Add person: same pipeline as "Add person" on the bench, then the rate. */
export async function addPersonWithRate(raw: unknown): Promise<AddPersonResult> {
  const dict = await getDictionary();
  const validated = validatePersonRate(raw, dict.talent.validation, { requireName: true });
  if (validated.errors) return validated.errors;
  const d = validated.data as PersonRateInput & { fullName: string };
  const added = await addPersonToBench({ fullName: d.fullName, role: d.role ?? "" });
  if (added.error || !added.id) return added;
  const rate = await setPersonRate(added.id, raw);
  if (rate.error) return { ...rate, id: added.id };
  return added;
}

export interface AddPersonResult extends ActionResult {
  id?: string;
  merged?: boolean;
}

/**
 * "+ Add person": the SAME pipeline as Sourcing manual entry (validate →
 * normalise → dedupe → ingest → score), then the same "save to bench" service.
 * Never writes to a Talent-only table for identity.
 */
export async function addPersonToBench(raw: unknown): Promise<AddPersonResult> {
  const dict = await getDictionary();
  const result = validateTalentInput(raw, dict.sourcing.talentInput.validation);
  if (!result.data) return { error: result.error, fieldErrors: result.fieldErrors };

  const actor = await currentActor();
  if (!actor.id) return { error: dict.pricing.errors.mustSignIn };

  const stats = await ingestTalent([result.data], { sourceId: manualConnector.id, actor });
  const id = stats.ids[0];
  if (!id) return fail("ingest failed");

  const supabase = await createClient();
  const bench = await markInTalentBench(supabase, [id], actor);
  if (bench.error) return fail(bench.error);

  revalidateTalent();
  return { id, merged: stats.merged > 0 };
}
