import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import type { Locale } from "@/lib/i18n/config";

import { fitToTarget, newItemId, round2 } from "./calculations";
import { templateProposal } from "./template";
import type { GeneratedProposal, ProposalItem, ProposalSource, TemplateLabels } from "./types";

const MODEL = "claude-opus-5";

export function isAiProposalEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM = `You write client-facing pricing plans for GRAFIQ, a premium creative/digital agency (web, branding, 3D, motion, marketing).
Return ONLY a JSON object: {"title": string, "intro": string, "items": [{"title": string, "description": string, "kind": "hourly"|"fixed"|"unit", "hours": number, "rate": number, "quantity": number, "unitPrice": number, "unitLabel": string, "amount": number}], "notes": string}
Rules: write in the requested language; 4–8 items that describe deliverables and phases the client understands (no internal cost jargon);
each item has a one-sentence description of what the client gets; "fixed" items carry the price in "amount", "hourly" items carry "hours" and a sell "rate", "unit" items carry "quantity", "unitPrice" and a short "unitLabel" (e.g. pcs) — use "unit" when the project is priced per piece;
the items must add up to the given client price (excluding VAT); never mention margins, costs or freelancers; be concrete and calm, no hype.`;

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

function toItems(raw: unknown): ProposalItem[] {
  if (!Array.isArray(raw)) return [];
  const items: ProposalItem[] = [];
  for (const r of raw.slice(0, 12)) {
    if (typeof r !== "object" || r === null) continue;
    const o = r as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title.trim().slice(0, 200) : "";
    if (!title) continue;
    const kind = o.kind === "hourly" ? "hourly" : o.kind === "unit" ? "unit" : "fixed";
    const hours = kind === "hourly" ? Math.max(0, Number(o.hours) || 0) : 0;
    const rate = kind === "hourly" ? Math.max(0, Number(o.rate) || 0) : 0;
    const quantity = kind === "unit" ? Math.max(0, Number(o.quantity) || 0) : 0;
    const unitPrice = kind === "unit" ? Math.max(0, Number(o.unitPrice) || 0) : 0;
    const amount = kind === "hourly" ? round2(hours * rate) : kind === "unit" ? round2(quantity * unitPrice) : Math.max(0, Number(o.amount) || 0);
    items.push({ id: newItemId(), title, description: typeof o.description === "string" ? o.description.trim().slice(0, 600) : "", kind, hours, rate, quantity, unitPrice, unitLabel: typeof o.unitLabel === "string" ? o.unitLabel.trim().slice(0, 30) || null : null, amount });
  }
  return items;
}

async function askClaude(source: ProposalSource, locale: Locale): Promise<GeneratedProposal> {
  const client = new Anthropic();
  const lines = source.items.map((i) => `- ${i.name}: ${i.kind === "hourly" ? `${i.hours} h` : i.kind === "percent" ? `${i.percent} % of price` : i.kind === "unit" ? `${i.quantity} ${i.unitLabel ?? "units"}` : "fixed"}`).join("\n");
  const prompt = [
    `Language: ${locale === "cs" ? "Czech" : "English"}`,
    `Project: ${source.projectName}`,
    source.clientName ? `Client: ${source.clientName}` : null,
    `Client price excluding VAT: ${source.revenue} ${source.currency}`,
    source.unitCount && source.unitPrice ? `Priced per unit: ${source.unitCount} ${source.unitLabel ?? "units"} × ${source.unitPrice} ${source.currency}` : null,
    lines ? `Internal work breakdown (for structure only, do not expose costs):\n${lines}` : null,
    source.brief ? `Brief from the agency:\n${source.brief}` : null,
  ].filter(Boolean).join("\n\n");

  const response = await client.messages.create({ model: MODEL, max_tokens: 3000, system: SYSTEM, messages: [{ role: "user", content: prompt }] });
  if (response.stop_reason === "refusal") throw new Error("Claude declined to draft this plan.");
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const json = extractJson(text);
  const items = toItems(json?.items);
  if (!json || !items.length) throw new Error("Claude returned no parsable plan.");
  return {
    title: typeof json.title === "string" && json.title.trim() ? json.title.trim().slice(0, 200) : source.projectName,
    intro: typeof json.intro === "string" ? json.intro.trim().slice(0, 2000) : "",
    items: fitToTarget(items, source.revenue),
    notes: typeof json.notes === "string" ? json.notes.trim().slice(0, 2000) : null,
  };
}

/** AI draft when configured, otherwise (or on any failure) the deterministic template. */
export async function generateProposal(source: ProposalSource, locale: Locale, labels: TemplateLabels): Promise<{ generatedBy: "claude" | "template"; proposal: GeneratedProposal }> {
  if (isAiProposalEnabled()) {
    try {
      return { generatedBy: "claude", proposal: await askClaude(source, locale) };
    } catch (error) {
      console.error("[pricing] AI proposal failed, using template:", error instanceof Error ? error.message : error);
    }
  }
  return { generatedBy: "template", proposal: templateProposal(source, labels) };
}
