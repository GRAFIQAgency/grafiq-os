import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PendingActionRow, PendingActionStatus } from "@/types/database";

import { describeAction, type ActionDescription } from "./describe";

/**
 * Reads for the approval screen. These run as the signed-in user (RLS
 * applies), unlike the MCP endpoint's service-role reads.
 */

export interface PendingActionView {
  row: PendingActionRow;
  description: ActionDescription;
}

export async function listPendingActions(status: PendingActionStatus | "all" = "pending", limit = 50): Promise<PendingActionView[]> {
  const supabase = await createClient();
  let query = supabase.from("pending_actions").select("*").order("created_at", { ascending: false }).limit(limit);
  if (status !== "all") query = query.eq("status", status);
  const { data, error } = await query.returns<PendingActionRow[]>();
  if (error) {
    console.error("[hermes] listPendingActions failed:", error.message);
    return [];
  }
  return Promise.all((data ?? []).map(async (row) => ({ row, description: await describeAction(supabase, row) })));
}

export async function countPendingActions(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase.from("pending_actions").select("id", { count: "exact", head: true }).eq("status", "pending");
  if (error) return 0;
  return count ?? 0;
}
