/**
 * Deduplication: decide whether an incoming normalised record is the same
 * entity as an existing one, and merge without destroying data.
 * Pure functions — DB lookups happen in services/ingest.ts.
 */
import type { NormalizedCompany, NormalizedTalent } from "../connectors/types";
import { nameLocationKey, normalizeDomain, normalizeEmail, normalizeUrl, uniqueStrings } from "./normalize";

export interface MatchResult {
  confidence: number;
  reasons: string[];
}

/** Matches with confidence at or above this merge automatically. */
export const MERGE_THRESHOLD = 0.8;

export interface TalentKeys {
  emailKey: string | null;
  profileKey: string | null;
  portfolioKey: string | null;
  nameLocationKey: string | null;
}

export function talentKeys(t: Pick<NormalizedTalent, "email" | "profileUrl" | "portfolioUrl" | "fullName" | "country" | "city">): TalentKeys {
  return {
    emailKey: normalizeEmail(t.email),
    profileKey: normalizeUrl(t.profileUrl),
    portfolioKey: normalizeUrl(t.portfolioUrl),
    nameLocationKey: nameLocationKey(t.fullName, t.country, t.city),
  };
}

export function matchTalent(existing: TalentKeys, incoming: TalentKeys): MatchResult {
  const reasons: string[] = [];
  let confidence = 0;
  if (existing.emailKey && existing.emailKey === incoming.emailKey) {
    confidence = Math.max(confidence, 0.99);
    reasons.push("email");
  }
  if (existing.profileKey && existing.profileKey === incoming.profileKey) {
    confidence = Math.max(confidence, 0.95);
    reasons.push("profile_url");
  }
  if (existing.portfolioKey && existing.portfolioKey === incoming.portfolioKey) {
    confidence = Math.max(confidence, 0.85);
    reasons.push("portfolio_url");
  }
  if (existing.nameLocationKey && existing.nameLocationKey === incoming.nameLocationKey) {
    // Name + location alone is suggestive, not conclusive.
    confidence = Math.max(confidence, 0.8);
    reasons.push("name_location");
  }
  return { confidence, reasons };
}

export interface CompanyKeys {
  domain: string | null;
  registrationId: string | null;
  nameLocationKey: string | null;
}

export function companyKeys(c: Pick<NormalizedCompany, "website" | "registrationId" | "name" | "country" | "city">): CompanyKeys {
  return {
    domain: normalizeDomain(c.website),
    registrationId: (c.registrationId ?? "").replace(/\s+/g, "") || null,
    nameLocationKey: nameLocationKey(c.name, c.country, c.city),
  };
}

export function matchCompany(existing: CompanyKeys, incoming: CompanyKeys): MatchResult {
  const reasons: string[] = [];
  let confidence = 0;
  if (existing.domain && existing.domain === incoming.domain) {
    confidence = Math.max(confidence, 0.98);
    reasons.push("domain");
  }
  if (existing.registrationId && existing.registrationId === incoming.registrationId) {
    confidence = Math.max(confidence, 0.99);
    reasons.push("registration_id");
  }
  if (existing.nameLocationKey && existing.nameLocationKey === incoming.nameLocationKey) {
    confidence = Math.max(confidence, 0.8);
    reasons.push("name_location");
  }
  return { confidence, reasons };
}

/**
 * Merge policy: existing values win, empty fields are filled from the incoming
 * record, arrays are unioned. Conflicting scalar values are reported so they
 * can be kept in the source record instead of being lost.
 */
export interface MergeOutcome<T> {
  merged: T;
  conflicts: { field: string; existing: unknown; incoming: unknown }[];
}

export function mergeRecords<T extends Record<string, unknown>>(existing: T, incoming: Partial<T>): MergeOutcome<T> {
  const merged: Record<string, unknown> = { ...existing };
  const conflicts: MergeOutcome<T>["conflicts"] = [];

  for (const [field, incomingValue] of Object.entries(incoming)) {
    if (incomingValue === undefined || incomingValue === null || incomingValue === "") continue;
    const current = merged[field];

    if (Array.isArray(current) || Array.isArray(incomingValue)) {
      merged[field] = uniqueStrings(
        (current as string[] | undefined) ?? [],
        (incomingValue as string[] | undefined) ?? []
      );
      continue;
    }
    if (current === undefined || current === null || current === "") {
      merged[field] = incomingValue;
      continue;
    }
    if (current !== incomingValue) {
      conflicts.push({ field, existing: current, incoming: incomingValue });
    }
  }
  return { merged: merged as T, conflicts };
}
