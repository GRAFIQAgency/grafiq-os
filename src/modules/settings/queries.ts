import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { BusinessSettingsRow, RoleCostRow } from "@/types/database";

import { DEFAULT_BUSINESS_SETTINGS } from "./constants";
import { marginThresholds } from "./services";
import type { BusinessSettings, MarginThresholds, RoleCost } from "./types";

/**
 * Server-side read API for business settings.
 * Other modules import from here instead of touching the tables directly.
 */

function toBusinessSettings(row: BusinessSettingsRow): BusinessSettings {
  return {
    companyName: row.company_name,
    defaultCurrency: row.default_currency,
    vatRate: Number(row.vat_rate),
    targetMargin: Number(row.target_margin),
    warningMargin: Number(row.warning_margin),
    minimumMargin: Number(row.minimum_margin),
    paymentTerms: Array.isArray(row.payment_terms) ? row.payment_terms.map(Number) : [],
  };
}

function toRoleCost(row: RoleCostRow): RoleCost {
  return {
    id: row.id,
    name: row.name,
    hourlyCost: Number(row.hourly_cost),
    currency: row.currency,
    isActive: row.is_active,
    position: row.position,
  };
}

/**
 * Settings row plus whether it came from the database. Falls back to
 * DEFAULT_BUSINESS_SETTINGS when the migration has not been applied yet.
 */
export const loadBusinessSettings = cache(
  async (): Promise<{ settings: BusinessSettings; persisted: boolean }> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("business_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle<BusinessSettingsRow>();

    if (error || !data) {
      if (error) console.error("[settings] loadBusinessSettings failed:", error.message);
      return { settings: DEFAULT_BUSINESS_SETTINGS, persisted: false };
    }
    return { settings: toBusinessSettings(data), persisted: true };
  }
);

export async function getBusinessSettings(): Promise<BusinessSettings> {
  return (await loadBusinessSettings()).settings;
}

export async function getMarginThresholds(): Promise<MarginThresholds> {
  return marginThresholds(await getBusinessSettings());
}

export const listRoleCosts = cache(async (): Promise<RoleCost[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("role_costs")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<RoleCostRow[]>();

  if (error) {
    console.error("[settings] listRoleCosts failed:", error.message);
    return [];
  }
  return (data ?? []).map(toRoleCost);
});

/** Roles available for selection in other modules (e.g. Pricing cost lines). */
export async function listActiveRoleCosts(): Promise<RoleCost[]> {
  return (await listRoleCosts()).filter((role) => role.isActive);
}
