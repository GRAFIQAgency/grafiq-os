"use server";

import { getDictionary } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/interpolate";
import { createClient } from "@/lib/supabase/server";

import { csvImportConnector } from "../connectors/csv-import";
import { getConnector } from "../connectors/registry";
import { currentActor } from "../services/actor";
import { csvRowToCompany, csvRowToTalent, parseCsv } from "../services/csv";
import { ingestCompanies, ingestTalent } from "../services/ingest";
import type { ActionResult, EntityType } from "../types";
import { failure, revalidateSourcing } from "./shared";

const MAX_CSV_MB = 2;

export async function setSourceEnabled(id: string, enabled: boolean): Promise<ActionResult> {
  if (!getConnector(id)) return {};
  const supabase = await createClient();
  const { error } = await supabase.from("sourcing_sources").upsert({ id, enabled: Boolean(enabled), updated_at: new Date().toISOString() });
  if (error) return failure(error);
  revalidateSourcing();
  return {};
}

export async function testSource(id: string): Promise<{ ok: boolean; message?: string }> {
  const connector = getConnector(id);
  if (!connector) return { ok: false, message: "Unknown connector" };
  const supabase = await createClient();
  try {
    const result = await connector.testConnection();
    await supabase.from("sourcing_sources").update({ last_error: result.ok ? null : result.message ?? "Test failed" }).eq("id", id);
    revalidateSourcing();
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase.from("sourcing_sources").update({ last_error: message }).eq("id", id);
    revalidateSourcing();
    return { ok: false, message };
  }
}

export interface CsvImportResult extends ActionResult {
  created?: number;
  merged?: number;
  skipped?: number;
}

/** CSV upload → parse → normalise → same ingest pipeline as any connector. */
export async function importCsv(formData: FormData): Promise<CsvImportResult> {
  const dict = await getDictionary();
  const t = dict.sourcing;
  const entityType: EntityType = formData.get("entityType") === "company" ? "company" : "talent";
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: t.errors.fileRequired };
  if (file.size > MAX_CSV_MB * 1024 * 1024) return { error: interpolate(t.errors.fileTooLarge, { max: MAX_CSV_MB }) };

  const rows = parseCsv(await file.text());
  if (!rows.length) return { error: t.errors.invalidCsv };

  const ctx = { sourceId: csvImportConnector.id, actor: await currentActor() };
  const supabase = await createClient();

  if (entityType === "talent") {
    const records = rows.map(csvRowToTalent).filter((r): r is NonNullable<typeof r> => r !== null);
    if (!records.length) return { error: t.errors.nothingToImport };
    const stats = await ingestTalent(records, ctx);
    await supabase.from("sourcing_sources").update({ last_run_at: new Date().toISOString(), last_error: null }).eq("id", ctx.sourceId);
    revalidateSourcing();
    return { created: stats.created, merged: stats.merged, skipped: stats.skipped + (rows.length - records.length) };
  }

  const records = rows.map(csvRowToCompany).filter((r): r is NonNullable<typeof r> => r !== null);
  if (!records.length) return { error: t.errors.nothingToImport };
  const stats = await ingestCompanies(records, ctx);
  await supabase.from("sourcing_sources").update({ last_run_at: new Date().toISOString(), last_error: null }).eq("id", ctx.sourceId);
  revalidateSourcing();
  return { created: stats.created, merged: stats.merged, skipped: stats.skipped + (rows.length - records.length) };
}
