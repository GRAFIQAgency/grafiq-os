import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import type { CompanyLead, CompanySignal, RoleProfile, TalentCandidate } from "../types";
import { heuristicLeadScore, heuristicTalentScore } from "./heuristic";
import { clampScore, type ScoreResult } from "./types";

/**
 * Claude-based scorer. Only active when ANTHROPIC_API_KEY is set (server-side).
 * The heuristic result is passed in as a starting point so the model refines
 * an explainable baseline instead of inventing one. Output is advisory.
 */
const MODEL = "claude-opus-5";

export function isClaudeScoringEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM = `You are an evaluator for GRAFIQ, a premium creative/digital agency. You compare a record
against criteria and return ONLY a JSON object with this exact shape:
{"score": 0-100, "strengths": string[], "weaknesses": string[], "missingInfo": string[], "risks": string[], "reasoning": string}
Be concrete, cite evidence from the record, and never claim facts that are not in the data.
Subjective judgements must be phrased as opinions. Your output is advisory; a human decides.`;

function extractJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function toStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 8) : [];
}

async function askClaude(userPrompt: string, baseline: ScoreResult): Promise<ScoreResult> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });
  if (response.stop_reason === "refusal") throw new Error("Claude declined to evaluate this record.");
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const json = extractJson(text);
  if (!json || typeof json.score !== "number") throw new Error("Claude returned no parsable evaluation.");
  return {
    provider: "claude",
    model: MODEL,
    score: clampScore(json.score),
    strengths: toStringArray(json.strengths),
    weaknesses: toStringArray(json.weaknesses),
    missingInfo: toStringArray(json.missingInfo),
    risks: toStringArray(json.risks),
    reasoning: typeof json.reasoning === "string" ? json.reasoning : "",
    factors: baseline.factors,
  };
}

export async function claudeTalentScore(candidate: TalentCandidate, profile: RoleProfile | null): Promise<ScoreResult> {
  const baseline = heuristicTalentScore(candidate, profile);
  const prompt = [
    "ROLE PROFILE:", JSON.stringify(profile ?? { note: "none selected" }, null, 2),
    "\nCANDIDATE:", JSON.stringify(candidate, null, 2),
    "\nRULE-BASED BASELINE (refine, do not copy blindly):", JSON.stringify(baseline, null, 2),
  ].join("\n");
  return askClaude(prompt, baseline);
}

export async function claudeLeadScore(lead: CompanyLead, signals: CompanySignal[]): Promise<ScoreResult> {
  const baseline = heuristicLeadScore(lead, signals);
  const prompt = [
    "GRAFIQ sells: websites, redesigns, branding, UX/UI, Webflow development, creative production, 3D, digital marketing.",
    "\nCOMPANY:", JSON.stringify(lead, null, 2),
    "\nBUYING SIGNALS:", JSON.stringify(signals, null, 2),
    "\nRULE-BASED BASELINE (refine, do not copy blindly):", JSON.stringify(baseline, null, 2),
  ].join("\n");
  return askClaude(prompt, baseline);
}
