/**
 * Validates a talent record entered by a person (manual add form, public
 * application form) into a NormalizedTalent. Pure; messages are passed in.
 */
import type { NormalizedTalent } from "../connectors/types";

export interface TalentInputMessages {
  nameRequired: string;
  emailInvalid: string;
  urlInvalid: string;
  numberInvalid: string;
  consentRequired: string;
  tooLong: string;
}

export interface TalentInputResult {
  data?: NormalizedTalent;
  sourceUrl?: string;
  consent?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const MAX = 200;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
const text = (v: unknown, max = MAX) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v: unknown) =>
  typeof v === "string" ? v.split(/[,;]/).map((s) => s.trim()).filter(Boolean).slice(0, 30) : Array.isArray(v) ? v.map(String).slice(0, 30) : [];
const bool = (v: unknown) => v === true || v === "true" || v === "on" || v === "1";
const num = (v: unknown): number | null | undefined => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]) => (allowed.includes(v as T) ? (v as T) : undefined);
const url = (v: unknown): string | null | undefined => {
  const s = text(v, 500);
  if (!s) return undefined;
  try {
    const u = new URL(s.includes("://") ? s : `https://${s}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
};

export function validateTalentInput(raw: unknown, msg: TalentInputMessages, options: { requireConsent?: boolean } = {}): TalentInputResult {
  if (!isRecord(raw)) return { error: msg.nameRequired };
  const fieldErrors: Record<string, string> = {};

  const fullName = text(raw.fullName);
  if (!fullName) fieldErrors.fullName = msg.nameRequired;

  const emailRaw = text(raw.email);
  const email = emailRaw ? emailRaw.toLowerCase() : undefined;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = msg.emailInvalid;

  const profileUrl = url(raw.profileUrl);
  const portfolioUrl = url(raw.portfolioUrl);
  const sourceUrl = url(raw.sourceUrl);
  if (profileUrl === null) fieldErrors.profileUrl = msg.urlInvalid;
  if (portfolioUrl === null) fieldErrors.portfolioUrl = msg.urlInvalid;
  if (sourceUrl === null) fieldErrors.sourceUrl = msg.urlInvalid;

  const hourlyRateMin = num(raw.hourlyRateMin);
  const hourlyRateMax = num(raw.hourlyRateMax);
  const yearsExperience = num(raw.yearsExperience);
  if (hourlyRateMin === null) fieldErrors.hourlyRateMin = msg.numberInvalid;
  if (hourlyRateMax === null) fieldErrors.hourlyRateMax = msg.numberInvalid;
  if (yearsExperience === null) fieldErrors.yearsExperience = msg.numberInvalid;

  const summary = text(raw.summary, 2000);
  if (typeof raw.summary === "string" && raw.summary.length > 2000) fieldErrors.summary = msg.tooLong;

  const consent = bool(raw.consent);
  if (options.requireConsent && !consent) fieldErrors.consent = msg.consentRequired;

  if (Object.keys(fieldErrors).length) return { fieldErrors, error: Object.values(fieldErrors)[0] };

  const idBase = email ?? profileUrl ?? portfolioUrl ?? `${fullName.toLowerCase()}:${Date.now()}`;
  return {
    consent,
    sourceUrl: sourceUrl ?? undefined,
    data: {
      sourceEntityId: idBase.toLowerCase(),
      sourceUrl: sourceUrl ?? profileUrl ?? portfolioUrl ?? undefined,
      fullName,
      email,
      headline: text(raw.headline) || undefined,
      role: text(raw.role, 100) || undefined,
      profileUrl: profileUrl ?? undefined,
      portfolioUrl: portfolioUrl ?? undefined,
      country: text(raw.country, 100) || undefined,
      city: text(raw.city, 100) || undefined,
      remote: raw.remote === undefined ? undefined : bool(raw.remote),
      seniority: oneOf(raw.seniority, ["junior", "mid", "senior", "lead"] as const),
      employmentType: oneOf(raw.employmentType, ["freelancer", "contractor", "employee"] as const),
      hourlyRateMin: hourlyRateMin ?? undefined,
      hourlyRateMax: hourlyRateMax ?? undefined,
      rateCurrency: oneOf(raw.rateCurrency, ["CZK", "EUR", "USD"] as const),
      availability: oneOf(raw.availability, ["available", "limited", "unavailable", "unknown"] as const),
      yearsExperience: yearsExperience ?? undefined,
      agencyExperience: raw.agencyExperience === undefined ? undefined : bool(raw.agencyExperience),
      skills: list(raw.skills),
      technologies: list(raw.technologies),
      languages: list(raw.languages),
      summary: summary || undefined,
    },
  };
}

/** FormData → plain object (checkbox absent = undefined, present = "on"). */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") obj[key] = value;
  });
  return obj;
}
