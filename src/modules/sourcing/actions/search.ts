"use server";

import { revalidatePath } from "next/cache";

import { getModule } from "@/config/modules";
import { getDictionary } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/interpolate";
import { createClient } from "@/lib/supabase/server";

import { getSavedSearch } from "../queries/searches";
import { currentActor } from "../services/actor";
import { parseCompanyFilters, parseTalentFilters } from "../services/filters";
import { runSearchJob } from "../services/search-runner";
import type { ActionResult, EntityType, SearchRunResult } from "../types";

function base() {
  return getModule("sourcing").href;
}

function parseFilters(entityType: EntityType, raw: unknown) {
  const params = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, string | string[] | undefined>;
  return entityType === "talent" ? parseTalentFilters(params) : parseCompanyFilters(params);
}

/** Runs all enabled connectors for the entity type with the given URL-style filters. */
export async function runSearch(input: { entityType: EntityType; filters: unknown; savedSearchId?: string }): Promise<SearchRunResult> {
  const dict = await getDictionary();
  const entityType: EntityType = input.entityType === "company" ? "company" : "talent";
  try {
    const run = await runSearchJob({
      entityType,
      filters: parseFilters(entityType, input.filters),
      savedSearchId: input.savedSearchId,
      actor: await currentActor(),
    });
    revalidatePath(base(), "layout");
    return { run };
  } catch (error) {
    return { error: interpolate(dict.sourcing.search.runFailed, { message: error instanceof Error ? error.message : "unknown" }) };
  }
}

export async function saveSearch(input: { entityType: EntityType; name: string; filters: unknown }): Promise<ActionResult & { id?: string }> {
  const dict = await getDictionary();
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 200) : "";
  if (!name) return { error: dict.sourcing.searches.name };
  const entityType: EntityType = input.entityType === "company" ? "company" : "talent";
  const actor = await currentActor();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sourcing_searches")
    .insert({ entity_type: entityType, name, filters: parseFilters(entityType, input.filters), created_by: actor.id })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return { error: interpolate(dict.sourcing.errors.saveFailed, { message: error?.message ?? "unknown" }) };
  revalidatePath(`${base()}/searches`);
  return { id: data.id };
}

export async function deleteSavedSearch(id: string): Promise<ActionResult> {
  const dict = await getDictionary();
  const supabase = await createClient();
  const { error } = await supabase.from("sourcing_searches").delete().eq("id", id);
  if (error) return { error: interpolate(dict.sourcing.errors.saveFailed, { message: error.message }) };
  revalidatePath(`${base()}/searches`);
  return {};
}

export async function runSavedSearch(id: string): Promise<SearchRunResult> {
  const dict = await getDictionary();
  const saved = await getSavedSearch(id);
  if (!saved) return { error: dict.sourcing.errors.notFound };
  try {
    const run = await runSearchJob({ entityType: saved.entityType, filters: saved.filters, savedSearchId: saved.id, actor: await currentActor() });
    revalidatePath(base(), "layout");
    return { run };
  } catch (error) {
    return { error: interpolate(dict.sourcing.search.runFailed, { message: error instanceof Error ? error.message : "unknown" }) };
  }
}
