import type { RoleCost } from "@/modules/settings/types";

import type { PersonOption, RateSuggestion } from "../types";

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
