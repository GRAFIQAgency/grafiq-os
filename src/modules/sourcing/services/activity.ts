import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { EntityType } from "../types";
import type { Actor } from "./actor";

export type ActivityAction =
  | "created" | "merged" | "status_changed" | "saved_to_bench" | "saved_to_crm" | "scored"
  | "score_overridden" | "note_added" | "tags_changed" | "ratings_changed" | "source_updated" | "reviewed"
  // Projects module
  | "project_created" | "member_added" | "member_removed" | "task_completed" | "milestone_completed"
  | "change_request_approved" | "deadline_changed" | "financial_warning"
  // Sales module (entity_type = company)
  | "deal_stage_changed" | "deal_won" | "deal_lost" | "deal_updated" | "contact_added" | "contact_removed"
  // QA module (entity_type = project)
  | "qa_checklist_created" | "qa_started" | "qa_item_failed" | "qa_fix_task_created" | "qa_ready_for_review"
  | "qa_approved" | "qa_approval_revoked" | "qa_checklist_deleted";

/** Entities that share the polymorphic notes/activity tables. */
export type ActivityEntityType = EntityType | "project";

/** Lightweight audit trail. Failures are logged, never thrown. */
export async function logActivity(
  supabase: SupabaseClient,
  entries: { entityType: ActivityEntityType; entityId: string; action: ActivityAction; details?: Record<string, unknown> }[],
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
