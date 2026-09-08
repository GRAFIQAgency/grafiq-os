import { fitToTarget, newItemId, round2 } from "./calculations";
import type { GeneratedProposal, ProposalItem, ProposalSource, TemplateLabels, WorkType } from "./types";

/**
 * Deterministic pricing-plan draft: detect the TYPE of work from the project
 * name, cost lines and brief, then lay out the standard delivery process for
 * that type as plan items whose prices add up to the client price.
 * Used when no AI key is configured or the AI call fails, and shown to the
 * AI as the structure to follow.
 *
 * Per-unit estimates (e.g. 300 product renders) get one unit line instead:
 * count × unit price is what the client is buying.
 */

const KEYWORDS: [WorkType, string[]][] = [
  ["eshop", ["e-shop", "eshop", "shopify", "woocommerce", "obchod", "store", "e-commerce", "ecommerce"]],
  ["app", ["aplikac", " app", "mobile", "ios", "android", "saas", "dashboard", "portál", "portal", "platform"]],
  ["web", ["web", "website", "webflow", "landing", "stránk", "stranek", "microsite", "wordpress", "framer"]],
  ["threeD", ["3d", "render", "vizualiz", "visualis", "visualiz", "model", "produktov", "product shot"]],
  ["motion", ["video", "motion", "animac", "animation", "reel", "spot", "explainer", "clip"]],
  ["branding", ["brand", "logo", "identit", "vizuál", "visual identity", "rebrand", "manuál", "guideline"]],
  ["marketing", ["marketing", "kampa", "campaign", "ads", "ppc", "seo", "social", "sociál", "content", "obsah", "newsletter"]],
];

/** Work type from free text (project name + cost lines + brief). First match in priority order. */
export function detectWorkType(text: string): WorkType {
  const hay = ` ${text.toLowerCase()} `;
  for (const [type, words] of KEYWORDS) if (words.some((w) => hay.includes(w))) return type;
  return "other";
}

export function templateProposal(source: ProposalSource, labels: TemplateLabels): GeneratedProposal {
  const revenue = Math.max(0, source.revenue);
  let items: ProposalItem[];

  if ((source.unitCount ?? 0) > 0 && (source.unitPrice ?? 0) > 0) {
    const count = source.unitCount as number;
    const price = source.unitPrice as number;
    items = [{ id: newItemId(), title: source.projectName, description: labels.lineDescription, kind: "unit", hours: 0, rate: 0, quantity: count, unitPrice: price, unitLabel: source.unitLabel ?? null, amount: round2(count * price) }];
  } else {
    const workType = detectWorkType([source.projectName, ...source.items.map((i) => i.name), source.brief ?? ""].join(" "));
    const phases = labels.workTypes[workType].phases;
    items = phases.map((p) => ({ id: newItemId(), title: p.title, description: p.description, kind: "fixed" as const, hours: 0, rate: 0, quantity: 0, unitPrice: 0, unitLabel: null, amount: Math.round((revenue * p.share) / 100) }));
    items = fitToTarget(items, revenue);
  }

  return { title: source.projectName, intro: labels.intro, items, notes: labels.notes };
}
