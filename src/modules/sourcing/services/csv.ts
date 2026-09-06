/**
 * Minimal RFC-4180-ish CSV parser (quotes, escaped quotes, CRLF) and row
 * mappers into normalised connector records. No dependency on purpose.
 */
import type { NormalizedCompany, NormalizedTalent } from "../connectors/types";

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (nonEmpty.length < 2) return [];
  const headers = nonEmpty[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return nonEmpty.slice(1).map((cells) =>
    Object.fromEntries(headers.map((h, i) => [h, (cells[i] ?? "").trim()]))
  );
}

const listOf = (v: string | undefined) => (v ? v.split(/[;|]/).map((s) => s.trim()).filter(Boolean) : []);
const numOf = (v: string | undefined) => {
  if (!v) return undefined;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};
const boolOf = (v: string | undefined) => {
  const s = (v ?? "").toLowerCase();
  if (["1", "true", "yes", "y", "ano"].includes(s)) return true;
  if (["0", "false", "no", "n", "ne"].includes(s)) return false;
  return undefined;
};
const oneOf = <T extends string>(v: string | undefined, allowed: readonly T[]) =>
  allowed.includes((v ?? "").toLowerCase() as T) ? ((v ?? "").toLowerCase() as T) : undefined;
const currencyOf = (v: string | undefined) => {
  const c = (v ?? "").toUpperCase();
  return c === "CZK" || c === "EUR" || c === "USD" ? c : undefined;
};

export const TALENT_CSV_COLUMNS = [
  "full_name", "email", "role", "headline", "country", "city", "remote", "seniority",
  "employment_type", "hourly_rate_min", "hourly_rate_max", "rate_currency", "availability",
  "years_experience", "agency_experience", "skills", "technologies", "languages",
  "profile_url", "portfolio_url", "summary",
] as const;

export const COMPANY_CSV_COLUMNS = [
  "name", "website", "registration_id", "industry", "country", "city", "employee_count",
  "founded_year", "description", "technologies", "keywords", "business_model", "company_type",
  "language", "signals",
] as const;

/** Returns null for rows without the required field. */
export function csvRowToTalent(row: Record<string, string>, index: number): NormalizedTalent | null {
  const fullName = row.full_name || row.name;
  if (!fullName) return null;
  const email = row.email || undefined;
  return {
    sourceEntityId: email ? `email:${email.toLowerCase()}` : `row:${index}:${fullName.toLowerCase()}`,
    sourceUrl: row.profile_url || undefined,
    fullName,
    email,
    headline: row.headline || undefined,
    role: row.role || undefined,
    country: row.country || undefined,
    city: row.city || undefined,
    remote: boolOf(row.remote),
    seniority: oneOf(row.seniority, ["junior", "mid", "senior", "lead"] as const),
    employmentType: oneOf(row.employment_type, ["freelancer", "contractor", "employee"] as const),
    hourlyRateMin: numOf(row.hourly_rate_min),
    hourlyRateMax: numOf(row.hourly_rate_max),
    rateCurrency: currencyOf(row.rate_currency),
    availability: oneOf(row.availability, ["available", "limited", "unavailable", "unknown"] as const),
    yearsExperience: numOf(row.years_experience),
    agencyExperience: boolOf(row.agency_experience),
    skills: listOf(row.skills),
    technologies: listOf(row.technologies),
    languages: listOf(row.languages),
    profileUrl: row.profile_url || undefined,
    portfolioUrl: row.portfolio_url || undefined,
    summary: row.summary || undefined,
  };
}

export function csvRowToCompany(row: Record<string, string>, index: number): NormalizedCompany | null {
  const name = row.name || row.company_name;
  if (!name) return null;
  const website = row.website || row.domain || undefined;
  return {
    sourceEntityId: website ? `site:${website.toLowerCase()}` : `row:${index}:${name.toLowerCase()}`,
    sourceUrl: website,
    name,
    website,
    registrationId: row.registration_id || undefined,
    industry: row.industry || undefined,
    country: row.country || undefined,
    city: row.city || undefined,
    employeeCount: numOf(row.employee_count),
    foundedYear: numOf(row.founded_year),
    description: row.description || undefined,
    technologies: listOf(row.technologies),
    keywords: listOf(row.keywords),
    businessModel: oneOf(row.business_model, ["b2b", "b2c", "both"] as const),
    companyType: oneOf(row.company_type, [
      "saas", "ecommerce", "services", "agency", "manufacturing", "hospitality", "real_estate", "other",
    ] as const),
    language: row.language || undefined,
    signals: listOf(row.signals).map((type) => ({ type, strength: "medium" as const, confidence: 0.6 })),
  };
}
