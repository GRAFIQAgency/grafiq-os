import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { EntityType } from "../types";
import type { Actor } from "./actor";

export type ActivityAction =
  | "created" | "merged" | "status_changed" | "saved_to_bench" | "saved_to_crm" | "scored"
  | "score_overridden" | "note_added" | "tags_changed" | "ratings_changed" | "source_updated" | "reviewed";

/** Lightweight audit trail. Failures are logged, never thrown. */
export async function logActivity(
  supabase: SupabaseClient,
  entries: { entityType: EntityType; entityId: string; action: ActivityAction; details?: Record<string, unknown> }[],
  actor: Actor
) {
  if (!entries.length) return;
  const { error } = await supabase.from("activity_log").insert(
    entries.map((e) => ({
      entity_type: e.entityType,
      entity_id: e.entityId,
      action: e.action,
      actor_id: actor.id,
      actor_name: actor.name,
      details: e.details ?? {},
    }))
  );
  if (error) console.error("[sourcing] activity log failed:", error.message);
}
