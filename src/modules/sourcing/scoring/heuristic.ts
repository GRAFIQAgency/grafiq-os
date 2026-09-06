/**
 * Deterministic, explainable scorers. Used by default (no API key needed) and
 * as the fallback when the Claude scorer is unavailable. Pure functions.
 */
import type { CompanyLead, CompanySignal, RoleProfile, ScoreFactor, TalentCandidate } from "../types";
import { HOME_COUNTRIES, LEAD_SCORE_WEIGHTS, NEAR_COUNTRIES, TALENT_SCORE_WEIGHTS, TARGET_INDUSTRIES } from "./config";
import { clampScore, type ScoreResult } from "./types";

const lc = (s: string | null | undefined) => (s ?? "").toLowerCase();

function hasSkill(candidate: TalentCandidate, skill: string): boolean {
  const s = skill.toLowerCase();
  const pool = [...candidate.skills, ...candidate.technologies, candidate.headline ?? "", candidate.summary ?? ""].map(lc);
  return pool.some((p) => p.includes(s));
}

function weighted(factors: ScoreFactor[]): number {
  const total = factors.reduce((sum, f) => sum + f.weight, 0) || 1;
  return factors.reduce((sum, f) => sum + f.score * f.weight, 0) / total;
}

export function heuristicTalentScore(candidate: TalentCandidate, profile: RoleProfile | null): ScoreResult {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const missingInfo: string[] = [];
  const risks: string[] = [];
  const factors: ScoreFactor[] = [];
  const w = TALENT_SCORE_WEIGHTS;

  const required = profile?.requiredSkills ?? [];
  const nice = profile?.niceToHaveSkills ?? [];

  if (required.length) {
    const have = required.filter((s) => hasSkill(candidate, s));
    const missing = required.filter((s) => !hasSkill(candidate, s));
    factors.push({ factor: "requiredSkills", weight: w.requiredSkills, score: (have.length / required.length) * 100, note: `${have.length}/${required.length}` });
    if (have.length) strengths.push(`Covers required skills: ${have.join(", ")}`);
    if (missing.length) weaknesses.push(`No evidence of: ${missing.join(", ")}`);
  } else {
    factors.push({ factor: "requiredSkills", weight: w.requiredSkills, score: candidate.skills.length ? 60 : 30, note: "no role profile" });
    missingInfo.push("No role profile selected; skills judged generically.");
  }

  if (nice.length) {
    const have = nice.filter((s) => hasSkill(candidate, s));
    factors.push({ factor: "niceToHave", weight: w.niceToHave, score: (have.length / nice.length) * 100, note: `${have.length}/${nice.length}` });
    if (have.length) strengths.push(`Nice-to-have: ${have.join(", ")}`);
  }

  if (candidate.yearsExperience == null) {
    missingInfo.push("Years of experience unknown.");
    factors.push({ factor: "experience", weight: w.experience, score: 40 });
  } else {
    const min = profile?.minYearsExperience ?? 3;
    const ratio = Math.min(1.25, candidate.yearsExperience / Math.max(min, 1));
    factors.push({ factor: "experience", weight: w.experience, score: Math.min(100, ratio * 80), note: `${candidate.yearsExperience} y` });
    if (candidate.yearsExperience >= min) strengths.push(`${candidate.yearsExperience} years of experience`);
    else weaknesses.push(`Below minimum experience (${candidate.yearsExperience} < ${min} years)`);
  }

  if (candidate.hourlyRateMin == null && candidate.hourlyRateMax == null) {
    missingInfo.push("Hourly rate unknown.");
    factors.push({ factor: "rate", weight: w.rate, score: 50 });
  } else if (profile?.maxHourlyRate != null) {
    const rate = candidate.hourlyRateMin ?? candidate.hourlyRateMax ?? 0;
    const sameCurrency = !profile.rateCurrency || !candidate.rateCurrency || profile.rateCurrency === candidate.rateCurrency;
    if (!sameCurrency) {
      risks.push("Rate is in a different currency than the role budget.");
      factors.push({ factor: "rate", weight: w.rate, score: 50 });
    } else if (rate <= profile.maxHourlyRate) {
      strengths.push(`Rate within budget (${rate} ≤ ${profile.maxHourlyRate})`);
      factors.push({ factor: "rate", weight: w.rate, score: 100 });
    } else {
      weaknesses.push(`Rate above budget (${rate} > ${profile.maxHourlyRate})`);
      factors.push({ factor: "rate", weight: w.rate, score: Math.max(0, 100 - ((rate - profile.maxHourlyRate) / profile.maxHourlyRate) * 200) });
    }
  } else {
    factors.push({ factor: "rate", weight: w.rate, score: 70 });
  }

  const preferred = (profile?.preferredCountries ?? []).map(lc);
  if (preferred.length && candidate.country) {
    const ok = preferred.includes(lc(candidate.country)) || candidate.remote === true;
    factors.push({ factor: "location", weight: w.location, score: ok ? 100 : 40 });
    if (!ok) weaknesses.push("Outside preferred locations and not remote.");
  } else {
    factors.push({ factor: "location", weight: w.location, score: candidate.remote ? 90 : 60 });
    if (!candidate.country) missingInfo.push("Location unknown.");
  }

  if (candidate.agencyExperience == null) {
    missingInfo.push("Agency experience unknown.");
    factors.push({ factor: "agency", weight: w.agency, score: 50 });
  } else if (candidate.agencyExperience) {
    strengths.push("Agency background");
    factors.push({ factor: "agency", weight: w.agency, score: 100 });
  } else {
    factors.push({ factor: "agency", weight: w.agency, score: profile?.agencyExperiencePreferred ? 30 : 70 });
    if (profile?.agencyExperiencePreferred) weaknesses.push("No agency experience.");
  }

  if (candidate.portfolioUrl) {
    strengths.push("Portfolio available");
    factors.push({ factor: "portfolio", weight: w.portfolio, score: 100 });
  } else {
    factors.push({ factor: "portfolio", weight: w.portfolio, score: profile?.portfolioRequired === false ? 60 : 20 });
    if (profile?.portfolioRequired !== false) weaknesses.push("No portfolio link.");
    missingInfo.push("Portfolio not provided.");
  }

  if (candidate.availability === "unavailable") risks.push("Currently unavailable.");
  if (candidate.availability === "unknown" || candidate.availability == null) missingInfo.push("Availability unknown.");

  const score = clampScore(weighted(factors));
  return {
    provider: "heuristic",
    score,
    strengths,
    weaknesses,
    missingInfo,
    risks,
    reasoning: profile
      ? `Rule-based comparison against role profile "${profile.name}": required skills, experience, rate, location, agency background and portfolio.`
      : "Rule-based generic assessment (no role profile selected).",
    factors,
  };
}

const SIGNAL_VALUE: Record<string, number> = {
  recently_funded: 90, hiring_marketing: 85, hiring_designer: 80, hiring_developer: 70,
  launching_product: 75, new_market: 70, new_office: 55, rebrand: 95, new_management: 60,
  rapid_growth: 75, old_website: 80, poor_mobile: 75, weak_branding: 85, outdated_tech: 65,
  missing_conversion: 70,
};
const STRENGTH_MULT = { low: 0.6, medium: 0.85, high: 1 } as const;
const OPPORTUNITY_SIGNALS = ["old_website", "poor_mobile", "weak_branding", "outdated_tech", "missing_conversion"];
const GROWTH_SIGNALS = ["recently_funded", "rapid_growth", "new_market", "new_office", "launching_product"];

export function heuristicLeadScore(lead: CompanyLead, signals: CompanySignal[]): ScoreResult {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const missingInfo: string[] = [];
  const risks: string[] = [];
  const factors: ScoreFactor[] = [];
  const w = LEAD_SCORE_WEIGHTS;

  // Company fit: B2B/B2C + type we can serve.
  const fitScore = lead.companyType ? (["saas", "ecommerce", "hospitality", "real_estate", "services"].includes(lead.companyType) ? 85 : 55) : 50;
  factors.push({ factor: "companyFit", weight: w.companyFit, score: fitScore });
  if (fitScore >= 85) strengths.push(`Good ICP fit (${lead.companyType})`);
  if (!lead.companyType) missingInfo.push("Company type unknown.");

  // Size sweet spot 10–200 employees.
  if (lead.employeeCount == null) {
    missingInfo.push("Employee count unknown.");
    factors.push({ factor: "companySize", weight: w.companySize, score: 50 });
  } else {
    const n = lead.employeeCount;
    const sizeScore = n < 5 ? 25 : n <= 10 ? 55 : n <= 200 ? 95 : n <= 500 ? 70 : 45;
    factors.push({ factor: "companySize", weight: w.companySize, score: sizeScore, note: `${n} employees` });
    if (sizeScore >= 90) strengths.push(`${n} employees — ideal size`);
    if (n < 5) weaknesses.push("Very small company; limited budget.");
    if (n > 500) risks.push("Large company — long procurement cycles.");
  }

  const industryScore = lead.industry ? (TARGET_INDUSTRIES.includes(lc(lead.industry)) ? 90 : 55) : 50;
  factors.push({ factor: "industryRelevance", weight: w.industryRelevance, score: industryScore });
  if (industryScore >= 90) strengths.push(`Target industry: ${lead.industry}`);
  if (!lead.industry) missingInfo.push("Industry unknown.");

  if (signals.length === 0) {
    factors.push({ factor: "buyingSignals", weight: w.buyingSignals, score: 20 });
    weaknesses.push("No buying signals detected yet.");
  } else {
    const values = signals.map((s) => (SIGNAL_VALUE[s.type] ?? 50) * STRENGTH_MULT[s.strength] * (0.5 + s.confidence / 2));
    const best = Math.max(...values);
    const bonus = Math.min(15, (signals.length - 1) * 5);
    factors.push({ factor: "buyingSignals", weight: w.buyingSignals, score: Math.min(100, best + bonus), note: `${signals.length} signals` });
    for (const s of signals.slice(0, 4)) strengths.push(s.description ?? s.type.replace(/_/g, " "));
  }

  const opp = signals.filter((s) => OPPORTUNITY_SIGNALS.includes(s.type));
  factors.push({ factor: "websiteOpportunity", weight: w.websiteOpportunity, score: opp.length ? Math.min(100, 60 + opp.length * 20) : 40 });
  if (!opp.length && !lead.website) missingInfo.push("Website unknown — opportunity analysis not possible.");

  const growth = signals.filter((s) => GROWTH_SIGNALS.includes(s.type));
  factors.push({ factor: "growth", weight: w.growth, score: growth.length ? 90 : 45 });
  if (!growth.length) weaknesses.push("No recent growth or funding information.");

  const country = lc(lead.country);
  const locScore = HOME_COUNTRIES.includes(country) ? 100 : NEAR_COUNTRIES.includes(country) ? 80 : country ? 55 : 40;
  factors.push({ factor: "location", weight: w.location, score: locScore });
  if (locScore === 100) strengths.push("Home market");

  const budget = lead.revenue != null ? (lead.revenue > 1_000_000 ? 90 : 60) : lead.employeeCount != null ? Math.min(90, 40 + lead.employeeCount / 4) : 50;
  factors.push({ factor: "budgetPotential", weight: w.budgetPotential, score: budget });

  const score = clampScore(weighted(factors));
  return {
    provider: "heuristic",
    score,
    strengths,
    weaknesses,
    missingInfo,
    risks,
    reasoning: "Rule-based lead score from company fit, size, industry, buying signals, website opportunity, growth, location and budget potential.",
    factors,
  };
}
