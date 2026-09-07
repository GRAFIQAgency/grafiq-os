import type { MarginThresholds } from "@/modules/settings/types";

import { grossMargin, healthStatus, totalDirectCosts } from "./calculations";
import type { EstimateInput, EstimateListItem, EstimateWithItems } from "./types";

/** Converts a saved estimate (DB rows) into calculator input. */
export function estimateFromRows(row: EstimateWithItems): EstimateInput {
  const items = [...row.pricing_cost_items].sort((a, b) => a.position - b.position);
  return {
    id: row.id,
    projectName: row.project_name,
    clientName: row.client_name ?? "",
    currency: row.currency,
    revenue: Number(row.revenue),
    targetMargin: Number(row.target_margin),
    items: items.map((item) => ({
      name: item.name,
      kind: item.kind,
      hours: Number(item.hours),
      hourlyRate: Number(item.hourly_rate),
      fixedAmount: Number(item.fixed_amount),
      percent: Number(item.percent ?? 0),
    })),
  };
}

/** Builds a "Recent Estimates" row, computing margin and health from the items. */
export function estimateToListItem(row: EstimateWithItems, thresholds: MarginThresholds): EstimateListItem {
  const input = estimateFromRows(row);
  const margin = grossMargin(input.revenue, totalDirectCosts(input.items, input.revenue));
  return {
    id: row.id,
    projectName: row.project_name,
    clientName: row.client_name,
    currency: row.currency,
    revenue: input.revenue,
    grossMargin: margin,
    health: healthStatus(margin, thresholds),
    createdAt: row.created_at,
  };
}
