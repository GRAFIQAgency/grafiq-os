"use server";

import { getDictionary } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";

import { inboundApplicationConnector } from "../connectors/manual";
import { ingestTalent } from "../services/ingest";
import { formDataToObject, validateTalentInput } from "../services/talent-input";

export interface ApplicationResult {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** Simple anti-spam: a hidden field humans never fill. */
const HONEYPOT_FIELD = "company_website";

/**
 * Public application form (no session). Writes through the service-role
 * client after strict validation; consent is required and stored with the
 * source record.
 */
export async function submitApplication(formData: FormData): Promise<ApplicationResult> {
  const dict = await getDictionary();
  const t = dict.sourcing.apply;
  const raw = formDataToObject(formData);

  if (typeof raw[HONEYPOT_FIELD] === "string" && raw[HONEYPOT_FIELD]) return { ok: true }; // silently drop bots

  const result = validateTalentInput(raw, dict.sourcing.talentInput.validation, { requireConsent: true });
  if (!result.data) return { error: result.error, fieldErrors: result.fieldErrors };

  const admin = createAdminClient();
  if (!admin) return { error: t.notConfigured };

  const record = { ...result.data, summary: [result.data.summary, `Consent given ${new Date().toISOString()}`].filter(Boolean).join("\n") };
  const stats = await ingestTalent([record], {
    sourceId: inboundApplicationConnector.id,
    actor: { id: null, name: "Applicant" },
    client: admin,
  });
  if (!stats.ids.length) return { error: t.failed };
  return { ok: true };
}
