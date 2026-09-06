"use server";

import { createClient } from "@/lib/supabase/server";
import type { TalentCandidateRow } from "@/types/database";

import { RATING_KEYS, TALENT_STATUSES } from "../constants";
import { rowToTalent } from "../queries/mappers";
import { getRoleProfile } from "../queries/role-profiles";
import { scoreTalent } from "../scoring";
import { currentActor } from "../services/actor";
import { logActivity } from "../services/activity";
import type { ActionResult, TalentRatings, TalentStatus } from "../types";
import { cleanIds, cleanScore, cleanTags, failure, revalidateSourcing } from "./shared";

export async function updateTalentStatus(ids: string[], status: TalentStatus): Promise<ActionResult> {
  const list = cleanIds(ids);
  if (!list.length || !TALENT_STATUSES.includes(status)) return {};
  const supabase = await createClient();
  const actor = await currentActor();
  const { error } = await supabase.from("talent_candidates").update({ status }).in("id", list);
  if (error) return failure(error);
  await logActivity(supabase, list.map((id) => ({ entityType: "talent" as const, entityId: id, action: status === "reviewed" ? "reviewed" as const : "status_changed" as const, details: { status } })), actor);
  revalidateSourcing();
  return {};
}

/** Save to Talent Bench = the shared person record becomes visible to the Talent module. */
export async function saveTalentToBench(ids: string[]): Promise<ActionResult> {
  const list = cleanIds(ids);
  if (!list.length) return {};
  const supabase = await createClient();
  const actor = await currentActor();
  const { data, error } = await supabase
    .from("talent_candidates")
    .update({ in_talent_bench: true, bench_added_at: new Date().toISOString() })
    .in("id", list)
    .eq("in_talent_bench", false)
    .select("id, status")
    .returns<{ id: string; status: TalentStatus }[]>();
  if (error) return failure(error);
  // Promote still-unreviewed candidates to shortlisted so the pipeline stays truthful.
  const toPromote = (data ?? []).filter((r) => ["discovered", "reviewed"].includes(r.status)).map((r) => r.id);
  if (toPromote.length) await supabase.from("talent_candidates").update({ status: "shortlisted" }).in("id", toPromote);
  await logActivity(supabase, (data ?? []).map((r) => ({ entityType: "talent" as const, entityId: r.id, action: "saved_to_bench" as const })), actor);
  revalidateSourcing();
  return {};
}

export async function addTalentTag(ids: string[], tag: string): Promise<ActionResult> {
  const list = cleanIds(ids);
  const [clean] = cleanTags([tag]);
  if (!list.length || !clean) return {};
  const supabase = await createClient();
  const actor = await currentActor();
  const { data, error } = await supabase.from("talent_candidates").select("id, tags").in("id", list).returns<{ id: string; tags: string[] }[]>();
  if (error) return failure(error);
  for (const row of data ?? []) {
    if (row.tags.includes(clean)) continue;
    await supabase.from("talent_candidates").update({ tags: [...row.tags, clean] }).eq("id", row.id);
  }
  await logActivity(supabase, list.map((id) => ({ entityType: "talent" as const, entityId: id, action: "tags_changed" as const, details: { added: clean } })), actor);
  revalidateSourcing();
  return {};
}

export async function setTalentTags(id: string, tags: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const actor = await currentActor();
  const clean = cleanTags(tags);
  const { error } = await supabase.from("talent_candidates").update({ tags: clean }).eq("id", id);
  if (error) return failure(error);
  await logActivity(supabase, [{ entityType: "talent", entityId: id, action: "tags_changed", details: { tags: clean } }], actor);
  revalidateSourcing();
  return {};
}

export async function setTalentRatings(id: string, ratings: TalentRatings): Promise<ActionResult> {
  const clean: TalentRatings = {};
  for (const key of RATING_KEYS) {
    const v = Number(ratings?.[key]);
    if (Number.isFinite(v) && v >= 1 && v <= 10) clean[key] = Math.round(v);
  }
  const supabase = await createClient();
  const actor = await currentActor();
  const { error } = await supabase.from("talent_candidates").update({ ratings: clean }).eq("id", id);
  if (error) return failure(error);
  await logActivity(supabase, [{ entityType: "talent", entityId: id, action: "ratings_changed", details: clean }], actor);
  revalidateSourcing();
  return {};
}

export async function setTalentManualScore(id: string, score: number | null): Promise<ActionResult> {
  const supabase = await createClient();
  const actor = await currentActor();
  const clean = cleanScore(score);
  const { error } = await supabase.from("talent_candidates").update({ manual_score: clean }).eq("id", id);
  if (error) return failure(error);
  await logActivity(supabase, [{ entityType: "talent", entityId: id, action: "score_overridden", details: { score: clean } }], actor);
  revalidateSourcing();
  return {};
}

/** Re-runs scoring against a chosen role profile (optionally with Claude). */
export async function rescoreTalent(id: string, roleProfileId: string | null, useAi: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const actor = await currentActor();
  const { data } = await supabase.from("talent_candidates").select("*").eq("id", id).maybeSingle<TalentCandidateRow>();
  if (!data) return {};
  const profile = await getRoleProfile(roleProfileId);
  const result = await scoreTalent(rowToTalent(data), profile, Boolean(useAi));
  const { error } = await supabase.from("ai_evaluations").insert({
    entity_type: "talent", entity_id: id, role_profile_id: profile?.id ?? null, provider: result.provider, model: result.model ?? null,
    score: result.score, strengths: result.strengths, weaknesses: result.weaknesses, missing_info: result.missingInfo,
    risks: result.risks, reasoning: result.reasoning, factors: result.factors,
  });
  if (error) return failure(error);
  await supabase.from("talent_candidates").update({ ai_score: result.score }).eq("id", id);
  await logActivity(supabase, [{ entityType: "talent", entityId: id, action: "scored", details: { score: result.score, provider: result.provider } }], actor);
  revalidateSourcing();
  return {};
}
