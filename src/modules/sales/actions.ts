"use server";

import { revalidatePath } from "next/cache";

import { getModule } from "@/config/modules";
import { getDictionary } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/interpolate";
import { createClient } from "@/lib/supabase/server";
import { manualConnector } from "@/modules/sourcing/connectors/manual";
import { currentActor } from "@/modules/sourcing/services/actor";
import { logActivity } from "@/modules/sourcing/services/activity";
import { markInCrm } from "@/modules/sourcing/services/crm";
import { ingestCompanies } from "@/modules/sourcing/services/ingest";

import { CRM_STAGES } from "./constants";
import { stageTransition } from "./services/pipeline";
import type { ActionResult, CrmStage } from "./types";
import { validateContact, validateDealDetails } from "./validation";

function revalidateSales() {
  revalidatePath(getModule("sales").href, "layout");
  revalidatePath(getModule("sourcing").href, "layout");
  revalidatePath(getModule("projects").href, "layout");
}

async function fail(message: string): Promise<ActionResult> {
  const dict = await getDictionary();
  return { error: interpolate(dict.sales.errors.saveFailed, { message }) };
}

/** Moves a deal to another stage. Won / lost stamp timestamps; the company record itself is never copied. */
export async function setDealStage(id: string, stage: CrmStage, lostReason?: string | null): Promise<ActionResult> {
  if (!CRM_STAGES.includes(stage)) return {};
  const dict = await getDictionary();
  const supabase = await createClient();
  const actor = await currentActor();
  const reason = typeof lostReason === "string" ? lostReason.trim().slice(0, 500) || null : null;
  if (stage === "lost" && !reason) return { error: dict.sales.validation.lostReasonRequired, fieldErrors: { lostReason: dict.sales.validation.lostReasonRequired } };

  const { data: before } = await supabase.from("company_leads").select("crm_status").eq("id", id).maybeSingle<{ crm_status: CrmStage | null }>();
  const { error } = await supabase.from("company_leads").update({ crm_status: stage, crm_added_at: before?.crm_status ? undefined : new Date().toISOString() }).eq("id", id);
  if (error) return fail(error.message);
  const { error: detailsError } = await supabase.from("company_crm_details").upsert({ company_id: id, ...stageTransition(stage, reason, new Date()) });
  if (detailsError) return fail(detailsError.message);

  // Keep the sourcing pipeline status truthful without overriding a richer state.
  if (stage === "customer") await supabase.from("company_leads").update({ status: "qualified" }).eq("id", id).in("status", ["discovered", "reviewed", "shortlisted", "contacted"]);
  if (stage === "contacted") await supabase.from("company_leads").update({ status: "contacted" }).eq("id", id).in("status", ["discovered", "reviewed", "shortlisted"]);

  const action = stage === "customer" ? "deal_won" : stage === "lost" ? "deal_lost" : "deal_stage_changed";
  await logActivity(supabase, [{ entityType: "company", entityId: id, action, details: { from: before?.crm_status ?? null, to: stage, ...(reason ? { reason } : {}) } }], actor);
  revalidateSales();
  return {};
}

/** Saves deal fields (owner, value, probability, dates, next step, estimate link). Creates the details row lazily. */
export async function saveDealDetails(id: string, raw: unknown): Promise<ActionResult> {
  const dict = await getDictionary();
  const validated = validateDealDetails(raw, dict.sales.validation);
  if (validated.errors) return validated.errors;
  const d = validated.data;

  const supabase = await createClient();
  const actor = await currentActor();
  const { error } = await supabase.from("company_crm_details").upsert({
    company_id: id,
    owner_id: d.ownerId,
    deal_value: d.dealValue,
    deal_currency: d.dealCurrency,
    probability: d.probability,
    expected_close: d.expectedClose,
    next_step: d.nextStep,
    next_action_at: d.nextActionAt,
    pricing_estimate_id: d.pricingEstimateId,
  });
  if (error) return fail(error.message);
  await logActivity(supabase, [{ entityType: "company", entityId: id, action: "deal_updated", details: { value: d.dealValue, currency: d.dealCurrency, nextAction: d.nextActionAt } }], actor);
  revalidateSales();
  return {};
}

export async function addContact(companyId: string, raw: unknown): Promise<ActionResult> {
  const dict = await getDictionary();
  const validated = validateContact(raw, dict.sales.validation);
  if (validated.errors) return validated.errors;
  const c = validated.data;
  const supabase = await createClient();
  const actor = await currentActor();
  const { error } = await supabase.from("company_contacts").insert({
    company_id: companyId, name: c.name, job_title: c.jobTitle, email: c.email, phone: c.phone, profile_url: c.profileUrl, source_id: manualConnector.id,
  });
  if (error) return fail(error.message);
  await logActivity(supabase, [{ entityType: "company", entityId: companyId, action: "contact_added", details: { name: c.name } }], actor);
  revalidateSales();
  return {};
}

export async function deleteContact(companyId: string, contactId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const actor = await currentActor();
  const { data, error } = await supabase.from("company_contacts").delete().eq("id", contactId).eq("company_id", companyId).select("name").maybeSingle<{ name: string }>();
  if (error) return fail(error.message);
  if (data) await logActivity(supabase, [{ entityType: "company", entityId: companyId, action: "contact_removed", details: { name: data.name } }], actor);
  revalidateSales();
  return {};
}

export interface AddCompanyResult extends ActionResult {
  id?: string;
  merged?: boolean;
}

/**
 * "+ Add company": the SAME pipeline as Sourcing manual entry (normalise →
 * dedupe → ingest), then the same "save to CRM" service. Never writes to a
 * Sales-only table for identity, so a company known from Sourcing is reused.
 */
export async function addCompanyToPipeline(raw: { name?: string; website?: string; country?: string; industry?: string }): Promise<AddCompanyResult> {
  const dict = await getDictionary();
  const name = typeof raw?.name === "string" ? raw.name.trim().slice(0, 200) : "";
  if (!name) return { error: dict.sales.validation.companyNameRequired, fieldErrors: { name: dict.sales.validation.companyNameRequired } };
  const clean = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
  const website = clean(raw.website, 300);
  if (website && !/^https?:\/\//i.test(website)) return { error: dict.sales.validation.invalidUrl, fieldErrors: { website: dict.sales.validation.invalidUrl } };

  const actor = await currentActor();
  if (!actor.id) return { error: dict.pricing.errors.mustSignIn };

  const stats = await ingestCompanies(
    [{
      sourceEntityId: website ? `site:${website.toLowerCase()}` : `manual:${name.toLowerCase()}:${Date.now()}`,
      sourceUrl: website, name, website, country: clean(raw.country, 80), industry: clean(raw.industry, 80),
    }],
    { sourceId: manualConnector.id, actor }
  );
  const id = stats.ids[0];
  if (!id) return fail("company ingest failed");

  const supabase = await createClient();
  const crm = await markInCrm(supabase, [id], actor);
  if (crm.error) return fail(crm.error);
  revalidateSales();
  return { id, merged: stats.merged > 0 };
}
