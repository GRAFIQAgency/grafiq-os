"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import { getModule } from "@/config/modules";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/interpolate";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/queries";
import { getBusinessSettings } from "@/modules/settings/queries";

import { estimateFromRows } from "../mappers";
import { getEstimate } from "../queries";
import { generateProposal } from "./generate";
import type { ActionResult, TemplateLabels } from "./types";
import { validateProposal } from "./validation";

function revalidate(id?: string) {
  revalidatePath(getModule("pricing").href);
  if (id) revalidatePath(`${getModule("pricing").href}/proposals/${id}`);
}

export interface CreateProposalResult extends ActionResult {
  id?: string;
}

/**
 * "Generate pricing plan": drafts a client-facing plan from a saved estimate
 * (AI when ANTHROPIC_API_KEY is set, else the template) and stores it as a
 * draft. The estimate itself is not touched.
 */
export async function createProposalFromEstimate(estimateId: string, brief?: string): Promise<CreateProposalResult> {
  const [dict, locale, user] = await Promise.all([getDictionary(), getLocale(), getCurrentUser()]);
  const t = dict.pricing.proposal;
  if (!user) return { error: dict.pricing.errors.mustSignIn };
  const row = await getEstimate(estimateId);
  if (!row) return { error: t.errors.notFound };
  const estimate = estimateFromRows(row);
  const settings = await getBusinessSettings();

  const labels: TemplateLabels = {
    intro: interpolate(t.template.intro, { project: estimate.projectName, company: settings.companyName }),
    notes: t.template.notes,
    lineDescription: t.template.lineDescription,
    phases: (["discovery", "design", "development", "launch"] as const).map((k) => ({ title: t.template.phases[k].title, description: t.template.phases[k].description, share: t.template.phases[k].share })),
  };
  const { generatedBy, proposal } = await generateProposal(
    { projectName: estimate.projectName, clientName: estimate.clientName || null, currency: estimate.currency, revenue: estimate.revenue, targetMargin: estimate.targetMargin, items: estimate.items, brief: typeof brief === "string" ? brief.trim().slice(0, 2000) || undefined : undefined },
    locale,
    labels
  );

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pricing_proposals")
    .insert({
      created_by: user.user.id, estimate_id: estimateId, share_token: randomBytes(18).toString("base64url"),
      title: proposal.title, client_name: estimate.clientName || null, intro: proposal.intro || null, currency: estimate.currency,
      vat_rate: settings.vatRate, items: proposal.items, notes: proposal.notes, generated_by: generatedBy,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return { error: interpolate(t.errors.generateFailed, { message: error?.message ?? "unknown" }) };
  revalidate(data.id);
  return { id: data.id };
}

export async function saveProposal(id: string, raw: unknown): Promise<ActionResult> {
  const dict = await getDictionary();
  const t = dict.pricing.proposal;
  const validated = validateProposal(raw, t.validation);
  if (validated.errors) return validated.errors;
  const d = validated.data;
  const supabase = await createClient();
  const { error } = await supabase.from("pricing_proposals").update({
    title: d.title, client_name: d.clientName, intro: d.intro, currency: d.currency, vat_rate: d.vatRate, items: d.items, notes: d.notes, valid_until: d.validUntil,
  }).eq("id", id);
  if (error) return { error: interpolate(t.errors.saveFailed, { message: error.message }) };
  revalidate(id);
  return {};
}

/** Publishes the public link (status = shared). Sharing again keeps the same link. */
export async function shareProposal(id: string): Promise<ActionResult> {
  const dict = await getDictionary();
  const supabase = await createClient();
  const { error } = await supabase.from("pricing_proposals").update({ status: "shared", shared_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: interpolate(dict.pricing.proposal.errors.saveFailed, { message: error.message }) };
  revalidate(id);
  return {};
}
