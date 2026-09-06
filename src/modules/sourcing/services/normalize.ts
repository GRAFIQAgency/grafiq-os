/**
 * Pure normalisation helpers used for deduplication keys.
 * Keys are deterministic so the same person/company from two sources collide.
 */

export function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeEmail(email: string | null | undefined): string | null {
  const e = (email ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

/** Strips protocol, www, query, hash and trailing slash: "https://www.X.com/a/?b" → "x.com/a". */
export function normalizeUrl(url: string | null | undefined): string | null {
  const raw = (url ?? "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const path = u.pathname.replace(/\/+$/, "").toLowerCase();
    return `${host}${path}`;
  } catch {
    return null;
  }
}

/** "https://www.Example.com/about" → "example.com". */
export function normalizeDomain(urlOrDomain: string | null | undefined): string | null {
  const raw = (urlOrDomain ?? "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    return host.includes(".") ? host : null;
  } catch {
    return null;
  }
}

/** Company-name + location key, ignoring legal suffixes. */
const LEGAL_SUFFIXES = /\b(s r o|sro|a s|as|gmbh|ltd|llc|inc|co|corp|plc|sa|bv|oy|ab|ag|kg|se|sp z o o|zoo)\b/g;

export function nameLocationKey(name: string | null | undefined, country?: string | null, city?: string | null): string | null {
  const n = normalizeText(name).replace(LEGAL_SUFFIXES, "").replace(/\s+/g, " ").trim();
  if (!n) return null;
  const loc = normalizeText(city) || normalizeText(country);
  return loc ? `${n}|${loc}` : n;
}

export function uniqueStrings(...lists: (readonly string[] | null | undefined)[]): string[] {
  const seen = new Map<string, string>();
  for (const list of lists) {
    for (const item of list ?? []) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) seen.set(key, trimmed);
    }
  }
  return [...seen.values()];
}

export function sizeBucketFor(employeeCount: number | null | undefined) {
  if (employeeCount == null) return null;
  if (employeeCount <= 10) return "1-10" as const;
  if (employeeCount <= 50) return "11-50" as const;
  if (employeeCount <= 200) return "51-200" as const;
  if (employeeCount <= 500) return "201-500" as const;
  if (employeeCount <= 1000) return "501-1000" as const;
  return "1000+" as const;
}
