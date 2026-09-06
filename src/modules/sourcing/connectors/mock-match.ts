/** In-memory filtering used by the mock connectors (mirrors the DB filters loosely). */
import type { CompanyFilters, TalentFilters } from "../types";
import type { NormalizedCompany, NormalizedTalent } from "./types";

const lc = (s: string | undefined | null) => (s ?? "").toLowerCase();
const includesAll = (haystack: string[], needles: string[] | undefined) =>
  !needles?.length || needles.every((n) => haystack.some((h) => h.toLowerCase().includes(n.toLowerCase())));

export function matchesTalentFilters(t: NormalizedTalent, f: TalentFilters): boolean {
  const text = [t.fullName, t.headline, t.role, t.summary, t.city, t.country, ...(t.skills ?? []), ...(t.technologies ?? [])].map(lc).join(" ");
  if (f.q && !f.q.toLowerCase().split(/\s+/).every((w) => text.includes(w))) return false;
  if (f.role && !lc(t.role).includes(f.role.toLowerCase())) return false;
  if (!includesAll([...(t.skills ?? []), ...(t.technologies ?? [])], f.skills)) return false;
  if (!includesAll(t.technologies ?? [], f.technologies)) return false;
  if (f.country && lc(t.country) !== f.country.toLowerCase()) return false;
  if (f.city && lc(t.city) !== f.city.toLowerCase()) return false;
  if (f.remote !== undefined && t.remote !== f.remote) return false;
  if (f.seniority && t.seniority !== f.seniority) return false;
  if (f.employmentType && t.employmentType !== f.employmentType) return false;
  if (f.rateMin !== undefined && (t.hourlyRateMax ?? 0) < f.rateMin) return false;
  if (f.rateMax !== undefined && (t.hourlyRateMin ?? Infinity) > f.rateMax) return false;
  if (f.availability && t.availability !== f.availability) return false;
  if (!includesAll(t.languages ?? [], f.languages)) return false;
  if (f.minYears !== undefined && (t.yearsExperience ?? 0) < f.minYears) return false;
  if (f.hasPortfolio && !t.portfolioUrl) return false;
  if (f.agencyExperience !== undefined && t.agencyExperience !== f.agencyExperience) return false;
  return true;
}

export function matchesCompanyFilters(c: NormalizedCompany, f: CompanyFilters): boolean {
  const text = [c.name, c.industry, c.description, c.city, c.country, ...(c.keywords ?? []), ...(c.technologies ?? [])].map(lc).join(" ");
  if (f.q && !f.q.toLowerCase().split(/\s+/).every((w) => text.includes(w))) return false;
  if (f.country && lc(c.country) !== f.country.toLowerCase()) return false;
  if (f.city && lc(c.city) !== f.city.toLowerCase()) return false;
  if (f.industry && !lc(c.industry).includes(f.industry.toLowerCase())) return false;
  if (f.employeesMin !== undefined && (c.employeeCount ?? 0) < f.employeesMin) return false;
  if (f.employeesMax !== undefined && (c.employeeCount ?? Infinity) > f.employeesMax) return false;
  if (!includesAll(c.technologies ?? [], f.technologies)) return false;
  if (!includesAll([...(c.keywords ?? []), c.description ?? ""], f.keywords)) return false;
  if (f.foundedAfter !== undefined && (c.foundedYear ?? 0) < f.foundedAfter) return false;
  if (f.foundedBefore !== undefined && (c.foundedYear ?? Infinity) > f.foundedBefore) return false;
  if (f.businessModel && c.businessModel !== f.businessModel) return false;
  if (f.companyType && c.companyType !== f.companyType) return false;
  if (f.language && lc(c.language) !== f.language.toLowerCase()) return false;
  if (f.signals?.length && !f.signals.some((s) => c.signals?.some((x) => x.type === s))) return false;
  return true;
}
