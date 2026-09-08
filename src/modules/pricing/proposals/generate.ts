import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import type { Locale } from "@/lib/i18n/config";

import { fitToTarget, newItemId, round2 } from "./calculations";
import { detectWorkType, templateProposal } from "./template";
import type { GeneratedProposal, ProposalItem, ProposalSource, TemplateLabels } from "./types";

const MODEL = "claude-opus-5";

export function isAiProposalEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM = `You write client-facing pricing plans for GRAFIQ, a premium creative/digital agency (websites, e-shops, branding, 3D product visualisation, video/motion, marketing, apps).

Method:
1. From the project name, the internal breakdown and the brief, decide WHAT KIND OF WORK this is (website, e-shop, branding, 3D visualisation / product renders, video or motion, marketing campaign, app, or other).
2. Lay out the STANDARD delivery process for that kind of work as the plan items, in the order the work happens (e.g. website: discovery & structure → wireframes & UX → visual design → development → content & SEO → testing, launch & handover). 5–8 items. Each item is a phase or deliverable the client understands, with a one-sentence description of what they get.
3. Split the client price across the items so they ADD UP EXACTLY to the given price excluding VAT. Weight the split by the effort each phase normally takes for this kind of work.

Return ONLY a JSON object:
{"workType": string, "title": string, "intro": string, "items": [{"title": string, "description": string, "kind": "hourly"|"fixed"|"unit", "hours": number, "rate": number, "quantity": number, "unitPrice": number, "unitLabel": string, "amount": number}], "notes": string}
Rules: write in the requested language; use "fixed" items with the price in "amount" unless the project is priced per piece (then a "unit" item with quantity, unitPrice and a short unitLabel); never mention margins, internal costs, hourly buy rates or freelancers; be concrete and calm, no hype.`;

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

async function askClaude(source: ProposalSource, locale: Locale, labels: TemplateLabels): Promise<GeneratedProposal> {
  const client = new Anthropic();
  const guess = detectWorkType([source.projectName, ...source.items.map((i) => i.name), source.brief ?? ""].join(" "));
  const lines = source.items.map((i) => `- ${i.name}: ${i.kind === "hourly" ? `${i.hours} h` : i.kind === "percent" ? `${i.percent} % of price` : i.kind === "unit" ? `${i.quantity} ${i.unitLabel ?? "units"}` : "fixed"}`).join("\n");
  const standard = labels.workTypes[guess].phases.map((p) => `- ${p.title} (~${p.share} %): ${p.description}`).join("\n");
  const prompt = [
    `Language: ${locale === "cs" ? "Czech" : "English"}`,
    `Project: ${source.projectName}`,
    source.clientName ? `Client: ${source.clientName}` : null,
    `Client price excluding VAT: ${source.revenue} ${source.currency}`,
    source.unitCount && source.unitPrice ? `Priced per unit: ${source.unitCount} ${source.unitLabel ?? "units"} × ${source.unitPrice} ${source.currency}` : null,
    lines ? `Internal work breakdown (hints about the work only — never expose costs):\n${lines}` : null,
    source.brief ? `Brief from the agency:\n${source.brief}` : null,
    `Our keyword guess for the kind of work: ${labels.workTypes[guess].name}. Standard process we normally use for it (adapt it, do not copy blindly):\n${standard}`,
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
      return { generatedBy: "claude", proposal: await askClaude(source, locale, labels) };
    } catch (error) {
      console.error("[pricing] AI proposal failed, using template:", error instanceof Error ? error.message : error);
    }
  }
  return { generatedBy: "template", proposal: templateProposal(source, labels) };
}
