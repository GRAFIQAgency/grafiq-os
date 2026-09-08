import { createClient } from "@/lib/supabase/server";
import type { ActivityLogRow } from "@/types/database";

/**
 * Company-wide activity feed (every entity type) for the Dashboard. The
 * per-entity reads live in `entity-extras.ts`; this is the same table, not a
 * second audit system.
 */
export interface RecentActivityEntry {
  id: string;
  createdAt: string;
  entityType: string;
  entityId: string;
  action: string;
  actorName: string | null;
  details: Record<string, unknown>;
}

export async function listRecentActivity(limit = 20): Promise<RecentActivityEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, created_at, entity_type, entity_id, action, actor_name, details")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<Pick<ActivityLogRow, "id" | "created_at" | "entity_type" | "entity_id" | "action" | "actor_name" | "details">[]>();
  if (error) {
    console.error("[sourcing] listRecentActivity failed:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id, createdAt: r.created_at, entityType: r.entity_type, entityId: r.entity_id,
    action: r.action, actorName: r.actor_name, details: r.details ?? {},
  }));
}
