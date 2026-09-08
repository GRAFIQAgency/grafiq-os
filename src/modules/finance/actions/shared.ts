import "server-only";

import { revalidatePath } from "next/cache";

import { getModule } from "@/config/modules";
import { getDictionary } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/interpolate";
import { createClient } from "@/lib/supabase/server";
import { currentActor } from "@/modules/sourcing/services/actor";
import { logActivity, type ActivityAction } from "@/modules/sourcing/services/activity";

import type { ActionResult } from "../types";

export function revalidateFinance(projectId?: string | null) {
  revalidatePath(getModule("finance").href, "layout");
  if (projectId) revalidatePath(`${getModule("projects").href}/${projectId}`);
}

export async function fail(message: string | undefined): Promise<ActionResult> {
  const dict = await getDictionary();
  return { error: interpolate(dict.finance.errors.saveFailed, { message: message ?? "unknown" }) };
}

/** Finance events that concern a project go to the project's activity log. */
export async function logProject(projectId: string | null | undefined, action: ActivityAction, details: Record<string, unknown>) {
  if (!projectId) return;
  const supabase = await createClient();
  await logActivity(supabase, [{ entityType: "project", entityId: projectId, action, details }], await currentActor());
}

/** Name snapshots for project / client so the row stays readable after the source is deleted. */
export async function projectSnapshot(projectId: string | null): Promise<{ project_name: string | null; client_id: string | null; client_name: string | null; currency: string | null }> {
  if (!projectId) return { project_name: null, client_id: null, client_name: null, currency: null };
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("name, currency, client_id, company_leads(name)").eq("id", projectId).maybeSingle<{ name: string; currency: string; client_id: string | null; company_leads: { name: string } | null }>();
  return { project_name: data?.name ?? null, client_id: data?.client_id ?? null, client_name: data?.company_leads?.name ?? null, currency: data?.currency ?? null };
}
