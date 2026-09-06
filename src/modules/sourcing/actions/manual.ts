"use server";

import { getDictionary } from "@/lib/i18n/server";

import { manualConnector } from "../connectors/manual";
import { currentActor } from "../services/actor";
import { ingestTalent } from "../services/ingest";
import { validateTalentInput } from "../services/talent-input";
import { revalidateSourcing } from "./shared";

export interface ManualAddResult {
  id?: string;
  merged?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** "Add talent" side panel: referrals and platforms where we hold an account. */
export async function addTalentManually(raw: unknown): Promise<ManualAddResult> {
  const dict = await getDictionary();
  const result = validateTalentInput(raw, dict.sourcing.talentInput.validation);
  if (!result.data) return { error: result.error, fieldErrors: result.fieldErrors };

  const actor = await currentActor();
  if (!actor.id) return { error: dict.pricing.errors.mustSignIn };

  const stats = await ingestTalent([result.data], { sourceId: manualConnector.id, actor });
  const id = stats.ids[0];
  if (!id) return { error: dict.sourcing.errors.saveFailed.replace("{message}", "ingest failed") };
  revalidateSourcing();
  return { id, merged: stats.merged > 0 };
}
