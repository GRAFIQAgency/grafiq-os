import "server-only";

import type { CompanyLead, CompanySignal, RoleProfile, TalentCandidate } from "../types";
import { claudeLeadScore, claudeTalentScore, isClaudeScoringEnabled } from "./claude";
import { heuristicLeadScore, heuristicTalentScore } from "./heuristic";
import type { ScoreResult } from "./types";

/**
 * Entry points used by the ingest pipeline and the "re-score" actions.
 * Claude is used when configured; any failure falls back to the heuristic so
 * scoring never blocks a search run.
 */
export async function scoreTalent(candidate: TalentCandidate, profile: RoleProfile | null, useAi = false): Promise<ScoreResult> {
  if (useAi && isClaudeScoringEnabled()) {
    try {
      return await claudeTalentScore(candidate, profile);
    } catch (error) {
      console.error("[sourcing] Claude talent scoring failed, using heuristic:", error instanceof Error ? error.message : error);
    }
  }
  return heuristicTalentScore(candidate, profile);
}

export async function scoreCompany(lead: CompanyLead, signals: CompanySignal[], useAi = false): Promise<ScoreResult> {
  if (useAi && isClaudeScoringEnabled()) {
    try {
      return await claudeLeadScore(lead, signals);
    } catch (error) {
      console.error("[sourcing] Claude lead scoring failed, using heuristic:", error instanceof Error ? error.message : error);
    }
  }
  return heuristicLeadScore(lead, signals);
}

export { isClaudeScoringEnabled };
export type { ScoreResult };
