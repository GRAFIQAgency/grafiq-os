import type { Currency, PersonPreset, RolePreset } from "./types";

/**
 * Cost-line presets: a line can be a specific person (Talent Bench, their own
 * rate) or a role default (Business Settings). Pure helpers, tested.
 */

export interface PresetMatch {
  kind: "person" | "role";
  /** Text put into the cost-line name. */
  name: string;
  /** Hourly cost in the estimate currency; null when unknown or in another currency. */
  hourlyCost: number | null;
  role: string | null;
}

const norm = (s: string) => s.trim().toLowerCase();

/** Finds the person or role a typed/picked name refers to. People win over roles with the same name. */
export function resolvePreset(name: string, people: PersonPreset[], roles: RolePreset[], currency: Currency): PresetMatch | null {
  const key = norm(name);
  if (!key) return null;
  const person = people.find((p) => norm(p.name) === key);
  if (person) {
    const own = person.hourlyCost != null && person.currency === currency ? person.hourlyCost : null;
    const roleDefault = person.role ? roles.find((r) => norm(r.name) === norm(person.role!) && r.currency === currency)?.hourlyCost ?? null : null;
    return { kind: "person", name: person.name, hourlyCost: own ?? roleDefault, role: person.role };
  }
  const role = roles.find((r) => norm(r.name) === key);
  if (role) return { kind: "role", name: role.name, hourlyCost: role.currency === currency ? role.hourlyCost : null, role: role.name };
  return null;
}

export interface PresetOption {
  value: string;
  label: string;
}

/** Datalist entries: people first (name + role + rate), then role defaults. */
export function presetOptions(
  people: PersonPreset[],
  roles: RolePreset[],
  currency: Currency,
  labels: { roleDefault: string; perHour: string; noRate: string }
): PresetOption[] {
  const money = (v: number | null, c: Currency) => (v == null ? labels.noRate : `${v} ${c}${labels.perHour}`);
  const peopleOptions = [...people]
    .sort((a, b) => (a.role ?? "").localeCompare(b.role ?? "") || a.name.localeCompare(b.name))
    .map((p) => {
      const rate = resolvePreset(p.name, people, roles, currency)?.hourlyCost ?? null;
      return { value: p.name, label: [p.role, money(rate, currency)].filter(Boolean).join(" · ") };
    });
  const roleOptions = roles.map((r) => ({ value: r.name, label: `${labels.roleDefault} · ${money(r.currency === currency ? r.hourlyCost : null, currency)}` }));
  return [...peopleOptions, ...roleOptions];
}
