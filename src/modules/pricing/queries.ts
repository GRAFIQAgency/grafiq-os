import { createClient } from "@/lib/supabase/server";
import { getBusinessSettings, getMarginThresholds, listActiveRoleCosts } from "@/modules/settings/queries";
import { listActiveTalent } from "@/modules/talent/queries";

import { RECENT_ESTIMATES_LIMIT } from "./constants";
import { estimateToListItem } from "./mappers";
import type { EstimateListItem, EstimateWithItems, PricingDefaults } from "./types";

/** Defaults for a new estimate: Business Settings (currency, margin, role defaults) + Talent Bench people rates. */
export async function getPricingDefaults(): Promise<PricingDefaults> {
  const [settings, roles, people] = await Promise.all([getBusinessSettings(), listActiveRoleCosts(), listActiveTalent()]);
  return {
    currency: settings.defaultCurrency,
    targetMargin: settings.targetMargin,
    rolePresets: roles.map((role) => ({
      name: role.name,
      hourlyCost: role.hourlyCost,
      currency: role.currency,
    })),
    peoplePresets: people.map((p) => ({
      id: p.id,
      name: p.fullName,
      role: p.role,
      hourlyCost: p.hourlyCost,
      currency: p.costCurrency,
    })),
  };
}

const ESTIMATE_WITH_ITEMS = "*, pricing_cost_items(*)";

export async function getEstimate(id: string): Promise<EstimateWithItems | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pricing_estimates")
    .select(ESTIMATE_WITH_ITEMS)
    .eq("id", id)
    .maybeSingle<EstimateWithItems>();

  if (error) {
    console.error("[pricing] getEstimate failed:", error.message);
    return null;
  }
  return data;
}

export async function listRecentEstimates(): Promise<EstimateListItem[]> {
  const supabase = await createClient();
  const thresholds = await getMarginThresholds();
  const { data, error } = await supabase
    .from("pricing_estimates")
    .select(ESTIMATE_WITH_ITEMS)
    .order("created_at", { ascending: false })
    .limit(RECENT_ESTIMATES_LIMIT)
    .returns<EstimateWithItems[]>();

  if (error) {
    // Most likely the migration has not been applied yet. Fail soft so the
    // calculator still works; the message shows up in the server log.
    console.error("[pricing] listRecentEstimates failed:", error.message);
    return [];
  }
  return (data ?? []).map((row) => estimateToListItem(row, thresholds));
}
