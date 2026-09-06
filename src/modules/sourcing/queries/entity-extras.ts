import { createClient } from "@/lib/supabase/server";
import type { ActivityLogRow, AiEvaluationRow, InternalNoteRow, SourcingSourceRecordRow } from "@/types/database";

import type { ActivityEntry, AiEvaluation, EntityType, InternalNote, SourceRecordSummary } from "../types";
import { rowToActivity, rowToEvaluation, rowToNote, rowToSourceRecord } from "./mappers";

/** Notes, activity, evaluations and source records shared by talent and company detail pages. */
export async function getEntityExtras(entityType: EntityType, entityId: string) {
  const supabase = await createClient();
  const [notes, activity, evaluations, sources] = await Promise.all([
    supabase.from("internal_notes").select("*").eq("entity_type", entityType).eq("entity_id", entityId)
      .order("created_at", { ascending: false }).returns<InternalNoteRow[]>(),
    supabase.from("activity_log").select("*").eq("entity_type", entityType).eq("entity_id", entityId)
      .order("created_at", { ascending: false }).limit(50).returns<ActivityLogRow[]>(),
    supabase.from("ai_evaluations").select("*").eq("entity_type", entityType).eq("entity_id", entityId)
      .order("created_at", { ascending: false }).limit(5).returns<AiEvaluationRow[]>(),
    supabase.from("sourcing_source_records").select("*").eq("entity_type", entityType).eq("entity_id", entityId)
      .order("retrieved_at", { ascending: false }).returns<SourcingSourceRecordRow[]>(),
  ]);
  return {
    notes: (notes.data ?? []).map(rowToNote) as InternalNote[],
    activity: (activity.data ?? []).map(rowToActivity) as ActivityEntry[],
    evaluations: (evaluations.data ?? []).map(rowToEvaluation) as AiEvaluation[],
    sources: (sources.data ?? []).map(rowToSourceRecord) as SourceRecordSummary[],
  };
}
