import { FALLBACK_TEMPLATE_SEED, TEMPLATE_SEED_BY_PROJECT_TYPE } from "../constants";

/**
 * Which template to suggest for a project type. Matches by explicit
 * `projectType` on the template first, then by the seeded key mapping, then
 * the generic seed, then the first active template. Pure; tested.
 */
export function recommendTemplate<T extends { id: string; projectType: string | null; seedKey: string | null; isActive: boolean }>(projectType: string, templates: readonly T[]): T | null {
  const active = templates.filter((t) => t.isActive);
  const byType = active.find((t) => t.projectType === projectType);
  if (byType) return byType;
  const seed = TEMPLATE_SEED_BY_PROJECT_TYPE[projectType] ?? FALLBACK_TEMPLATE_SEED;
  return active.find((t) => t.seedKey === seed) ?? active.find((t) => t.seedKey === FALLBACK_TEMPLATE_SEED) ?? active[0] ?? null;
}
