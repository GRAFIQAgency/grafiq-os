import type { RoleCost } from "@/modules/settings/types";

import type { PayModelSuggestion, PersonOption, RateSuggestion } from "../types";

/**
 * Suggested cost rate when assigning someone:
 * 1. the person's own Talent cost (person-specific)
 * 2. else the role default from Business Settings (matched by project role, then by the person's role)
 * 3. else nothing (enter manually)
 * The chosen value is then SNAPSHOTTED on the project member.
 */
export function suggestRate(person: PersonOption | null, projectRole: string | null, roleCosts: RoleCost[]): RateSuggestion {
  if (person && person.hourlyCost != null && person.costIsPersonSpecific) {
    return { rate: person.hourlyCost, currency: person.currency, source: "talent" };
  }
  const find = (name: string | null) => (name ? roleCosts.find((r) => r.isActive && r.name.toLowerCase() === name.toLowerCase()) : undefined);
  const roleCost = find(projectRole) ?? find(person?.role ?? null);
  if (roleCost) return { rate: roleCost.hourlyCost, currency: roleCost.currency, source: "role_default" };
  if (person && person.hourlyCost != null) return { rate: person.hourlyCost, currency: person.currency, source: "talent" };
  return { rate: null, currency: null, source: "manual" };
}

/**
 * Suggested pay model for a new assignment: the person's Talent default
 * (Settings → People rates). The project can still switch it — a freelancer may
 * be hourly on one project and fixed on another. Internal users default to hourly.
 */
export function suggestPayModel(person: PersonOption | null): PayModelSuggestion {
  if (!person || !person.pricingModel) return { payModel: "hourly", fixedCost: null, percent: null };
  return {
    payModel: person.pricingModel,
    fixedCost: person.pricingModel === "fixed" ? person.fixedPrice : null,
    percent: person.pricingModel === "percent" ? person.marginPercent : null,
  };
}
