"use server";

import { revalidatePath } from "next/cache";

import { getModule } from "@/config/modules";
import { createClient } from "@/lib/supabase/server";

import { currentActor } from "../services/actor";
import { logActivity, type ActivityEntityType } from "../services/activity";
import type { ActionResult } from "../types";
import { failure, revalidateSourcing } from "./shared";

export async function addNote(entityType: ActivityEntityType, entityId: string, body: string): Promise<ActionResult> {
  const text = typeof body === "string" ? body.trim().slice(0, 5000) : "";
  if (!text || !entityId) return {};
  const type: ActivityEntityType = entityType === "company" ? "company" : entityType === "project" ? "project" : "talent";
  const supabase = await createClient();
  const actor = await currentActor();
  const { error } = await supabase.from("internal_notes").insert({
    entity_type: type, entity_id: entityId, author_id: actor.id, author_name: actor.name, body: text,
  });
  if (error) return failure(error);
  await logActivity(supabase, [{ entityType: type, entityId, action: "note_added" }], actor);
  revalidateSourcing();
  if (type === "project") revalidatePath(getModule("projects").href, "layout");
  return {};
}
