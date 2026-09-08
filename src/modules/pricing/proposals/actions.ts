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
import { itemAmount } from "./calculations";
import { generateProposal } from "./generate";
import { getProposal } from "./queries";
import { WORK_TYPES, type ActionResult, type ProposalSource, type TemplateLabels } from "./types";
import { validateProposal } from "./validation";

type ProposalDict = Awaited<ReturnType<typeof getDictionary>>["pricing"]["proposal"];

function templateLabels(t: ProposalDict, projectName: string, companyName: string): TemplateLabels {
  return {
    intro: interpolate(t.template.intro, { project: projectName, company: companyName }),
    notes: t.template.notes,
    lineDescription: t.template.lineDescription,
    workTypes: Object.fromEntries(WORK_TYPES.map((k) => [k, { name: t.template.workTypes[k].name, phases: t.template.workTypes[k].phases.map((p) => ({ title: p.title, description: p.description, share: p.share })) }])) as TemplateLabels["workTypes"],
  };
}

const newToken = () => randomBytes(18).toString("base64url");

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

  const labels = templateLabels(t, estimate.projectName, settings.companyName);
  const { generatedBy, proposal } = await generateProposal(
    { projectName: estimate.projectName, clientName: estimate.clientName || null, currency: estimate.currency, revenue: estimate.revenue, targetMargin: estimate.targetMargin, items: estimate.items, unitCount: estimate.unitCount, unitPrice: estimate.unitPrice, unitLabel: estimate.unitLabel, brief: typeof brief === "string" ? brief.trim().slice(0, 2000) || undefined : undefined },
    locale,
    labels
  );

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pricing_proposals")
    .insert({
      created_by: user.user.id, estimate_id: estimateId, share_token: newToken(),
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

/**
 * "Generate again": re-drafts intro, items and notes (title and settings stay)
 * from the linked estimate — or from the plan itself when the estimate is gone —
 * optionally steered by a brief. Overwrites the current items.
 */
export async function regenerateProposal(id: string, brief?: string): Promise<ActionResult> {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const t = dict.pricing.proposal;
  const current = await getProposal(id);
  if (!current) return { error: t.errors.notFound };
  const settings = await getBusinessSettings();
  const row = current.estimateId ? await getEstimate(current.estimateId) : null;
  const estimate = row ? estimateFromRows(row) : null;
  const source: ProposalSource = estimate
    ? { projectName: estimate.projectName, clientName: estimate.clientName || null, currency: estimate.currency, revenue: estimate.revenue, targetMargin: estimate.targetMargin, items: estimate.items, unitCount: estimate.unitCount, unitPrice: estimate.unitPrice, unitLabel: estimate.unitLabel }
    : { projectName: current.title, clientName: current.clientName, currency: current.currency, revenue: current.items.reduce((s, i) => s + itemAmount(i), 0), targetMargin: settings.targetMargin, items: [] };
  source.brief = typeof brief === "string" ? brief.trim().slice(0, 2000) || undefined : undefined;

  const { generatedBy, proposal } = await generateProposal(source, locale, templateLabels(t, current.title, settings.companyName));
  const supabase = await createClient();
  const { error } = await supabase.from("pricing_proposals").update({ intro: proposal.intro || null, items: proposal.items, notes: proposal.notes, generated_by: generatedBy }).eq("id", id);
  if (error) return { error: interpolate(t.errors.saveFailed, { message: error.message }) };
  revalidate(id);
  return {};
}

/** Revokes the public link: back to draft AND a new token, so the old URL stops working for good. */
export async function unpublishProposal(id: string): Promise<ActionResult> {
  const dict = await getDictionary();
  const supabase = await createClient();
  const { error } = await supabase.from("pricing_proposals").update({ status: "draft", shared_at: null, share_token: newToken() }).eq("id", id);
  if (error) return { error: interpolate(dict.pricing.proposal.errors.saveFailed, { message: error.message }) };
  revalidate(id);
  return {};
}

/** Deletes the plan; its public URL dies with it. The estimate is untouched. */
export async function deleteProposal(id: string): Promise<ActionResult> {
  const dict = await getDictionary();
  const supabase = await createClient();
  const { error } = await supabase.from("pricing_proposals").delete().eq("id", id);
  if (error) return { error: interpolate(dict.pricing.proposal.errors.saveFailed, { message: error.message }) };
  revalidate();
  return {};
}
