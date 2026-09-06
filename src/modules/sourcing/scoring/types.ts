import type { CompanyLead, CompanySignal, RoleProfile, ScoreFactor, TalentCandidate } from "../types";

export interface ScoreResult {
  provider: "heuristic" | "claude";
  model?: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  missingInfo: string[];
  risks: string[];
  reasoning: string;
  factors: ScoreFactor[];
}

export interface TalentScorer {
  scoreTalent(candidate: TalentCandidate, profile: RoleProfile | null): Promise<ScoreResult>;
}

export interface CompanyScorer {
  scoreCompany(lead: CompanyLead, signals: CompanySignal[]): Promise<ScoreResult>;
}

export function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
