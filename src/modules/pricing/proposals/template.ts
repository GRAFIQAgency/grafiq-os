import { costItemTotal, totalDirectCosts } from "../calculations";
import { fitToTarget, newItemId, round2 } from "./calculations";
import type { GeneratedProposal, ProposalItem, ProposalSource, TemplateLabels } from "./types";

/**
 * Deterministic pricing-plan draft from an estimate. Used when no AI key is
 * configured or the AI call fails, and as the structure the AI is asked to follow.
 *
 * - With cost lines: one plan line per cost line, marked up so the plan adds
 *   up to the client price (each line keeps its share of the direct costs).
 *   Hourly cost lines become hourly plan lines with a SELL rate; fixed and
 *   percent cost lines become fixed plan lines.
 * - Per-unit estimates without cost lines: one unit line (count × unit price).
 * - Without cost lines (or with no costs): standard agency phases split by
 *   the given shares of the client price.
 */
export function templateProposal(source: ProposalSource, labels: TemplateLabels): GeneratedProposal {
  const revenue = Math.max(0, source.revenue);
  const costs = totalDirectCosts(source.items, revenue);
  const usable = source.items.filter((i) => i.name.trim() && costItemTotal(i, revenue) > 0);
  let items: ProposalItem[];

  if (usable.length && costs > 0 && revenue > 0) {
    const factor = revenue / costs;
    items = usable.map((i) => {
      const cost = costItemTotal(i, revenue);
      const base = { id: newItemId(), title: i.name, description: labels.lineDescription, quantity: 0, unitPrice: 0, unitLabel: null as string | null };
      if (i.kind === "hourly" && i.hours > 0) {
        const sellRate = Math.round(i.hourlyRate * factor);
        return { ...base, kind: "hourly" as const, hours: round2(i.hours), rate: sellRate, amount: round2(i.hours * sellRate) };
      }
      if (i.kind === "unit" && i.quantity > 0) {
        const sellUnit = Math.round(i.unitCost * factor);
        return { ...base, kind: "unit" as const, hours: 0, rate: 0, quantity: round2(i.quantity), unitPrice: sellUnit, unitLabel: i.unitLabel, amount: round2(i.quantity * sellUnit) };
      }
      return { ...base, kind: "fixed" as const, hours: 0, rate: 0, amount: Math.round(cost * factor) };
    });
    items = fitToTarget(items, revenue);
  } else if ((source.unitCount ?? 0) > 0 && (source.unitPrice ?? 0) > 0) {
    const count = source.unitCount as number;
    const price = source.unitPrice as number;
    items = [{ id: newItemId(), title: source.projectName, description: labels.lineDescription, kind: "unit", hours: 0, rate: 0, quantity: count, unitPrice: price, unitLabel: source.unitLabel ?? null, amount: round2(count * price) }];
  } else {
    items = labels.phases.map((p) => ({ id: newItemId(), title: p.title, description: p.description, kind: "fixed" as const, hours: 0, rate: 0, quantity: 0, unitPrice: 0, unitLabel: null, amount: Math.round((revenue * p.share) / 100) }));
    items = fitToTarget(items, revenue);
  }

  return { title: source.projectName, intro: labels.intro, items, notes: labels.notes };
}
