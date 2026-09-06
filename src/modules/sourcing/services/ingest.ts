import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { CompanyLeadRow, TalentCandidateRow } from "@/types/database";

import type { NormalizedCompany, NormalizedTalent } from "../connectors/types";
import { rowToCompany, rowToTalent } from "../queries/mappers";
import { findRoleProfileForRole } from "../queries/role-profiles";
import { scoreCompany, scoreTalent } from "../scoring";
import type { ScoreResult } from "../scoring/types";
import type { CompanySignal, EntityType } from "../types";
import type { Actor } from "./actor";
import { logActivity } from "./activity";
import { MERGE_THRESHOLD, companyKeys, matchCompany, matchTalent, mergeRecords, talentKeys } from "./dedupe";
import { sizeBucketFor, uniqueStrings } from "./normalize";

/**
 * COLLECT → NORMALIZE → DEDUPLICATE → ENRICH → SCORE → persist.
 * Called by the search runner and the CSV import with already-normalised records.
 */

export interface IngestContext {
  sourceId: string;
  runId?: string;
  actor: Actor;
}

export interface IngestStats {
  total: number;
  created: number;
  merged: number;
  skipped: number;
  ids: string[];
}

function emptyStats(): IngestStats {
  return { total: 0, created: 0, merged: 0, skipped: 0, ids: [] };
}

async function upsertSourceRecord(
  supabase: SupabaseClient,
  entityType: EntityType,
  entityId: string,
  record: { sourceEntityId: string; sourceUrl?: string },
  payload: Record<string, unknown>,
  ctx: IngestContext
) {
  await supabase.from("sourcing_source_records").upsert(
    {
      entity_type: entityType,
      entity_id: entityId,
      source_id: ctx.sourceId,
      source_entity_id: record.sourceEntityId,
      source_url: record.sourceUrl ?? null,
      run_id: ctx.runId ?? null,
      payload,
      retrieved_at: new Date().toISOString(),
    },
    { onConflict: "source_id,source_entity_id" }
  );
}

async function storeEvaluation(
  supabase: SupabaseClient,
  entityType: EntityType,
  entityId: string,
  result: ScoreResult,
  roleProfileId: string | null
) {
  await supabase.from("ai_evaluations").insert({
    entity_type: entityType,
    entity_id: entityId,
    role_profile_id: roleProfileId,
    provider: result.provider,
    model: result.model ?? null,
    score: result.score,
    strengths: result.strengths,
    weaknesses: result.weaknesses,
    missing_info: result.missingInfo,
    risks: result.risks,
    reasoning: result.reasoning,
    factors: result.factors,
  });
}

// ---------------------------------------------------------------------------
// Talent
// ---------------------------------------------------------------------------

function talentRowFrom(t: NormalizedTalent, actor: Actor) {
  const keys = talentKeys(t);
  return {
    created_by: actor.id,
    full_name: t.fullName,
    headline: t.headline ?? null,
    role: t.role ?? null,
    email: t.email ?? null,
    profile_url: t.profileUrl ?? null,
    portfolio_url: t.portfolioUrl ?? null,
    avatar_url: t.avatarUrl ?? null,
    country: t.country ?? null,
    city: t.city ?? null,
    remote: t.remote ?? null,
    seniority: t.seniority ?? null,
    employment_type: t.employmentType ?? null,
    hourly_rate_min: t.hourlyRateMin ?? null,
    hourly_rate_max: t.hourlyRateMax ?? null,
    rate_currency: t.rateCurrency ?? null,
    availability: t.availability ?? null,
    years_experience: t.yearsExperience ?? null,
    agency_experience: t.agencyExperience ?? null,
    skills: uniqueStrings(t.skills),
    technologies: uniqueStrings(t.technologies),
    languages: uniqueStrings(t.languages),
    summary: t.summary ?? null,
    email_key: keys.emailKey,
    profile_key: keys.profileKey,
    portfolio_key: keys.portfolioKey,
    name_location_key: keys.nameLocationKey,
  };
}

async function findExistingTalent(supabase: SupabaseClient, t: NormalizedTalent): Promise<TalentCandidateRow | null> {
  const keys = talentKeys(t);
  const clauses: string[] = [];
  if (keys.emailKey) clauses.push(`email_key.eq.${keys.emailKey}`);
  if (keys.profileKey) clauses.push(`profile_key.eq.${keys.profileKey}`);
  if (keys.portfolioKey) clauses.push(`portfolio_key.eq.${keys.portfolioKey}`);
  if (keys.nameLocationKey) clauses.push(`name_location_key.eq.${keys.nameLocationKey}`);
  if (!clauses.length) return null;

  const { data } = await supabase.from("talent_candidates").select("*").or(clauses.join(",")).limit(5).returns<TalentCandidateRow[]>();
  let best: { row: TalentCandidateRow; confidence: number } | null = null;
  for (const row of data ?? []) {
    const m = matchTalent(
      { emailKey: row.email_key, profileKey: row.profile_key, portfolioKey: row.portfolio_key, nameLocationKey: row.name_location_key },
      keys
    );
    if (m.confidence >= MERGE_THRESHOLD && (!best || m.confidence > best.confidence)) best = { row, confidence: m.confidence };
  }
  return best?.row ?? null;
}

async function scoreAndStoreTalent(supabase: SupabaseClient, row: TalentCandidateRow) {
  const candidate = rowToTalent(row);
  const profile = await findRoleProfileForRole(candidate.role);
  const result = await scoreTalent(candidate, profile);
  await storeEvaluation(supabase, "talent", row.id, result, profile?.id ?? null);
  await supabase.from("talent_candidates").update({ ai_score: result.score }).eq("id", row.id);
  return result.score;
}

export async function ingestTalent(records: NormalizedTalent[], ctx: IngestContext): Promise<IngestStats> {
  const supabase = await createClient();
  const stats = emptyStats();
  stats.total = records.length;

  for (const record of records) {
    try {
      const incoming = talentRowFrom(record, ctx.actor);
      const existing = await findExistingTalent(supabase, record);
      const payload: Record<string, unknown> = { ...record };

      if (existing) {
        const { merged, conflicts } = mergeRecords(existing as unknown as Record<string, unknown>, incoming as unknown as Record<string, unknown>);
        const { id: _id, created_at: _c, updated_at: _u, search_vector: _sv, ...update } = merged as unknown as TalentCandidateRow & { search_vector?: unknown };
        void _id; void _c; void _u; void _sv;
        const { data, error } = await supabase
          .from("talent_candidates")
          .update({ ...update, last_checked_at: new Date().toISOString() })
          .eq("id", existing.id)
          .select("*")
          .single<TalentCandidateRow>();
        if (error || !data) throw new Error(error?.message ?? "update failed");
        if (conflicts.length) payload.conflicts = conflicts;
        await upsertSourceRecord(supabase, "talent", data.id, record, payload, ctx);
        const score = await scoreAndStoreTalent(supabase, data);
        await logActivity(supabase, [
          { entityType: "talent", entityId: data.id, action: "merged", details: { sourceId: ctx.sourceId, conflicts: conflicts.length } },
          { entityType: "talent", entityId: data.id, action: "scored", details: { score } },
        ], ctx.actor);
        stats.merged++;
        stats.ids.push(data.id);
      } else {
        const { data, error } = await supabase.from("talent_candidates").insert(incoming).select("*").single<TalentCandidateRow>();
        if (error || !data) throw new Error(error?.message ?? "insert failed");
        await upsertSourceRecord(supabase, "talent", data.id, record, payload, ctx);
        const score = await scoreAndStoreTalent(supabase, data);
        await logActivity(supabase, [
          { entityType: "talent", entityId: data.id, action: "created", details: { sourceId: ctx.sourceId } },
          { entityType: "talent", entityId: data.id, action: "scored", details: { score } },
        ], ctx.actor);
        stats.created++;
        stats.ids.push(data.id);
      }
    } catch (error) {
      console.error("[sourcing] ingestTalent record failed:", error instanceof Error ? error.message : error);
      stats.skipped++;
    }
  }
  return stats;
}

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

function companyRowFrom(c: NormalizedCompany, actor: Actor) {
  const keys = companyKeys(c);
  return {
    created_by: actor.id,
    name: c.name,
    domain: keys.domain,
    website: c.website ?? null,
    logo_url: c.logoUrl ?? null,
    registration_id: keys.registrationId,
    industry: c.industry ?? null,
    country: c.country ?? null,
    city: c.city ?? null,
    employee_count: c.employeeCount ?? null,
    size_bucket: sizeBucketFor(c.employeeCount),
    revenue: c.revenue ?? null,
    revenue_currency: c.revenueCurrency ?? null,
    founded_year: c.foundedYear ?? null,
    description: c.description ?? null,
    technologies: uniqueStrings(c.technologies),
    keywords: uniqueStrings(c.keywords).map((k) => k.toLowerCase()),
    business_model: c.businessModel ?? null,
    company_type: c.companyType ?? null,
    language: c.language ?? null,
    name_location_key: keys.nameLocationKey,
  };
}

async function findExistingCompany(supabase: SupabaseClient, c: NormalizedCompany): Promise<CompanyLeadRow | null> {
  const keys = companyKeys(c);
  const clauses: string[] = [];
  if (keys.domain) clauses.push(`domain.eq.${keys.domain}`);
  if (keys.registrationId) clauses.push(`registration_id.eq.${keys.registrationId}`);
  if (keys.nameLocationKey) clauses.push(`name_location_key.eq.${keys.nameLocationKey}`);
  if (!clauses.length) return null;

  const { data } = await supabase.from("company_leads").select("*").or(clauses.join(",")).limit(5).returns<CompanyLeadRow[]>();
  let best: { row: CompanyLeadRow; confidence: number } | null = null;
  for (const row of data ?? []) {
    const m = matchCompany({ domain: row.domain, registrationId: row.registration_id, nameLocationKey: row.name_location_key }, keys);
    if (m.confidence >= MERGE_THRESHOLD && (!best || m.confidence > best.confidence)) best = { row, confidence: m.confidence };
  }
  return best?.row ?? null;
}

async function upsertSignalsAndContacts(supabase: SupabaseClient, companyId: string, c: NormalizedCompany, ctx: IngestContext) {
  if (c.signals?.length) {
    await supabase.from("company_signals").upsert(
      c.signals.map((s) => ({
        company_id: companyId,
        type: s.type,
        strength: s.strength,
        confidence: Math.max(0, Math.min(1, s.confidence)),
        detected_at: s.detectedAt ?? new Date().toISOString(),
        source_id: ctx.sourceId,
        description: s.description ?? null,
      })),
      { onConflict: "company_id,type,source_id" }
    );
  }
  if (c.contacts?.length) {
    const { data: existing } = await supabase.from("company_contacts").select("name").eq("company_id", companyId).returns<{ name: string }[]>();
    const known = new Set((existing ?? []).map((e) => e.name.toLowerCase()));
    const fresh = c.contacts.filter((k) => !known.has(k.name.toLowerCase()));
    if (fresh.length) {
      await supabase.from("company_contacts").insert(
        fresh.map((k) => ({
          company_id: companyId, name: k.name, job_title: k.jobTitle ?? null, email: k.email ?? null,
          phone: k.phone ?? null, profile_url: k.profileUrl ?? null, source_id: ctx.sourceId,
        }))
      );
    }
  }
}

async function scoreAndStoreCompany(supabase: SupabaseClient, row: CompanyLeadRow) {
  const lead = rowToCompany(row);
  const { data } = await supabase.from("company_signals").select("*").eq("company_id", row.id);
  const signals: CompanySignal[] = (data ?? []).map((s) => ({
    id: s.id, companyId: s.company_id, type: s.type, strength: s.strength, confidence: Number(s.confidence),
    detectedAt: s.detected_at, sourceId: s.source_id, description: s.description,
  }));
  const result = await scoreCompany(lead, signals);
  await storeEvaluation(supabase, "company", row.id, result, null);
  await supabase.from("company_leads").update({ lead_score: result.score }).eq("id", row.id);
  return result.score;
}

export async function ingestCompanies(records: NormalizedCompany[], ctx: IngestContext): Promise<IngestStats> {
  const supabase = await createClient();
  const stats = emptyStats();
  stats.total = records.length;

  for (const record of records) {
    try {
      const incoming = companyRowFrom(record, ctx.actor);
      const existing = await findExistingCompany(supabase, record);
      const { signals: _s, contacts: _k, ...payloadBase } = record;
      void _s; void _k;
      const payload: Record<string, unknown> = { ...payloadBase };

      let row: CompanyLeadRow;
      if (existing) {
        const { merged, conflicts } = mergeRecords(existing as unknown as Record<string, unknown>, incoming as unknown as Record<string, unknown>);
        const { id: _id, created_at: _c, updated_at: _u, search_vector: _sv, ...update } = merged as unknown as CompanyLeadRow & { search_vector?: unknown };
        void _id; void _c; void _u; void _sv;
        const { data, error } = await supabase
          .from("company_leads")
          .update({ ...update, last_checked_at: new Date().toISOString() })
          .eq("id", existing.id)
          .select("*")
          .single<CompanyLeadRow>();
        if (error || !data) throw new Error(error?.message ?? "update failed");
        if (conflicts.length) payload.conflicts = conflicts;
        row = data;
        stats.merged++;
      } else {
        const { data, error } = await supabase.from("company_leads").insert(incoming).select("*").single<CompanyLeadRow>();
        if (error || !data) throw new Error(error?.message ?? "insert failed");
        row = data;
        stats.created++;
      }

      await upsertSourceRecord(supabase, "company", row.id, record, payload, ctx);
      await upsertSignalsAndContacts(supabase, row.id, record, ctx);
      const score = await scoreAndStoreCompany(supabase, row);
      await logActivity(supabase, [
        { entityType: "company", entityId: row.id, action: existing ? "merged" : "created", details: { sourceId: ctx.sourceId } },
        { entityType: "company", entityId: row.id, action: "scored", details: { score } },
      ], ctx.actor);
      stats.ids.push(row.id);
    } catch (error) {
      console.error("[sourcing] ingestCompanies record failed:", error instanceof Error ? error.message : error);
      stats.skipped++;
    }
  }
  return stats;
}
