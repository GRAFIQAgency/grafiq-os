"use server";

import { createClient } from "@/lib/supabase/server";

import { currentActor } from "../services/actor";
import { logActivity } from "../services/activity";
import type { ActionResult, EntityType } from "../types";
import { failure, revalidateSourcing } from "./shared";

export async function addNote(entityType: EntityType, entityId: string, body: string): Promise<ActionResult> {
  const text = typeof body === "string" ? body.trim().slice(0, 5000) : "";
  if (!text || !entityId) return {};
  const type: EntityType = entityType === "company" ? "company" : "talent";
  const supabase = await createClient();
  const actor = await currentActor();
  const { error } = await supabase.from("internal_notes").insert({
    entity_type: type, entity_id: entityId, author_id: actor.id, author_name: actor.name, body: text,
  });
  if (error) return failure(error);
  await logActivity(supabase, [{ entityType: type, entityId, action: "note_added" }], actor);
  revalidateSourcing();
  return {};
}
