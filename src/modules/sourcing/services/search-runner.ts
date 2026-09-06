import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SourcingSearchRunRow } from "@/types/database";

import { searchConnectorsFor } from "../connectors/registry";
import type { SourceConnector } from "../connectors/types";
import { CONNECTOR_MAX_ATTEMPTS, CONNECTOR_RETRY_DELAY_MS } from "../constants";
import { rowToRun } from "../queries/mappers";
import { enabledSourceIds } from "../queries/sources";
import type { CompanyFilters, EntityType, SearchRun, SearchRunError, TalentFilters } from "../types";
import type { Actor } from "./actor";
import { ingestCompanies, ingestTalent } from "./ingest";

/**
 * Runs one search job across all enabled connectors for the entity type.
 * Each connector is isolated: a failure is recorded and the others continue.
 * Retries are deliberately gentle (CONNECTOR_MAX_ATTEMPTS).
 *
 * v1 executes inline inside the Server Action (mock/API connectors are fast).
 * The run row carries progress so this can move to a background worker later
 * without changing the UI contract.
 */

const RESULT_LIMIT_PER_SOURCE = 100;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function searchWithRetry(connector: SourceConnector, request: Parameters<SourceConnector["search"]>[0]) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= CONNECTOR_MAX_ATTEMPTS; attempt++) {
    try {
      return { response: await connector.search(request), retries: attempt - 1 };
    } catch (error) {
      lastError = error;
      if (attempt < CONNECTOR_MAX_ATTEMPTS) await sleep(CONNECTOR_RETRY_DELAY_MS * attempt);
    }
  }
  throw Object.assign(new Error(lastError instanceof Error ? lastError.message : String(lastError)), {
    retries: CONNECTOR_MAX_ATTEMPTS - 1,
  });
}

export interface RunSearchInput {
  entityType: EntityType;
  filters: TalentFilters | CompanyFilters;
  savedSearchId?: string;
  actor: Actor;
}

export async function runSearchJob(input: RunSearchInput): Promise<SearchRun> {
  const supabase = await createClient();
  const enabled = await enabledSourceIds();
  const active = searchConnectorsFor(input.entityType).filter((c) => enabled.has(c.id));

  const { data: created, error: createError } = await supabase
    .from("sourcing_search_runs")
    .insert({
      created_by: input.actor.id,
      search_id: input.savedSearchId ?? null,
      entity_type: input.entityType,
      filters: input.filters,
      status: "running",
      started_at: new Date().toISOString(),
      sources_total: active.length,
    })
    .select("*")
    .single<SourcingSearchRunRow>();
  if (createError || !created) throw new Error(createError?.message ?? "Could not create search run");

  const errors: SearchRunError[] = [];
  let total = 0;
  let fresh = 0;
  let duplicates = 0;
  let completed = 0;

  for (const connector of active) {
    try {
      const { response, retries } = await searchWithRetry(connector, {
        entityType: input.entityType,
        filters: input.filters,
        limit: RESULT_LIMIT_PER_SOURCE,
      });
      const ctx = { sourceId: connector.id, runId: created.id, actor: input.actor };
      const stats = input.entityType === "talent"
        ? await ingestTalent(response.talent, ctx)
        : await ingestCompanies(response.companies, ctx);

      total += stats.total;
      fresh += stats.created;
      duplicates += stats.merged;
      void retries;

      await supabase.from("sourcing_sources").update({
        last_run_at: new Date().toISOString(),
        last_error: null,
        records_collected: await nextRecordCount(supabase, connector.id, stats.total),
      }).eq("id", connector.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retries = typeof (error as { retries?: number })?.retries === "number" ? (error as { retries: number }).retries : 0;
      errors.push({ sourceId: connector.id, message, retries });
      await supabase.from("sourcing_sources").update({ last_run_at: new Date().toISOString(), last_error: message }).eq("id", connector.id);
    } finally {
      completed++;
      await supabase.from("sourcing_search_runs").update({
        sources_completed: completed, results_total: total, results_new: fresh, results_duplicates: duplicates, errors,
      }).eq("id", created.id);
    }
  }

  const status = active.length > 0 && errors.length === active.length ? "failed" : "completed";
  const { data: finished } = await supabase
    .from("sourcing_search_runs")
    .update({ status, finished_at: new Date().toISOString(), sources_completed: completed, results_total: total, results_new: fresh, results_duplicates: duplicates, errors })
    .eq("id", created.id)
    .select("*")
    .single<SourcingSearchRunRow>();

  if (input.savedSearchId) {
    await supabase.from("sourcing_searches").update({ last_run_at: new Date().toISOString() }).eq("id", input.savedSearchId);
  }

  return rowToRun(finished ?? { ...created, status, errors, results_total: total, results_new: fresh, results_duplicates: duplicates, sources_completed: completed });
}

async function nextRecordCount(supabase: Awaited<ReturnType<typeof createClient>>, sourceId: string, added: number) {
  const { data } = await supabase.from("sourcing_sources").select("records_collected").eq("id", sourceId).maybeSingle<{ records_collected: number }>();
  return (data?.records_collected ?? 0) + added;
}
