import type { Currency, PersonPreset, RolePreset } from "./types";
import type { PricingModel } from "@/types/database";

/**
 * Cost-line presets: a line can be a specific person (Talent Bench, their own
 * pay model and rate) or a role default (Business Settings, hourly). Pure
 * helpers, tested.
 */

export interface PresetMatch {
  kind: "person" | "role";
  /** Text put into the cost-line name. */
  name: string;
  role: string | null;
  /** How the line should be paid. */
  payModel: PricingModel;
  /** Hourly cost in the estimate currency; null when unknown or in another currency. */
  hourlyCost: number | null;
  /** Typical fixed price per project (payModel = fixed); null when not set or in another currency. */
  fixedPrice: number | null;
  /** Share of the client price (payModel = percent). */
  percent: number | null;
  /** Cost per unit (payModel = unit). */
  unitCost: number | null;
  unitLabel: string | null;
}

const norm = (s: string) => s.trim().toLowerCase();

/** Finds the person or role a typed/picked name refers to. People win over roles with the same name. */
export function resolvePreset(name: string, people: PersonPreset[], roles: RolePreset[], currency: Currency): PresetMatch | null {
  const key = norm(name);
  if (!key) return null;
  const person = people.find((p) => norm(p.name) === key);
  if (person) {
    const sameCurrency = person.currency === currency;
    const own = person.hourlyCost != null && sameCurrency ? person.hourlyCost : null;
    const roleDefault = person.role ? roles.find((r) => norm(r.name) === norm(person.role!) && r.currency === currency)?.hourlyCost ?? null : null;
    return {
      kind: "person", name: person.name, role: person.role, payModel: person.pricingModel,
      hourlyCost: own ?? roleDefault,
      fixedPrice: person.fixedPrice != null && sameCurrency ? person.fixedPrice : null,
      percent: person.marginPercent,
      unitCost: person.unitPrice != null && sameCurrency ? person.unitPrice : null,
      unitLabel: person.unitLabel,
    };
  }
  const role = roles.find((r) => norm(r.name) === key);
  if (role) {
    return { kind: "role", name: role.name, role: role.name, payModel: "hourly", hourlyCost: role.currency === currency ? role.hourlyCost : null, fixedPrice: null, percent: null, unitCost: null, unitLabel: null };
  }
  return null;
}

export interface PresetOption {
  value: string;
  label: string;
}

export interface PresetLabels {
  roleDefault: string;
  perHour: string;
  noRate: string;
  fixedPerProject: string;
  ofPrice: string;
  perUnit: string;
}

function describe(match: PresetMatch, currency: Currency, labels: PresetLabels): string {
  switch (match.payModel) {
    case "fixed":
      return match.fixedPrice != null ? `${labels.fixedPerProject} · ${match.fixedPrice} ${currency}` : labels.fixedPerProject;
    case "percent":
      return match.percent != null ? `${match.percent} % ${labels.ofPrice}` : labels.ofPrice;
    case "unit":
      return match.unitCost != null ? `${match.unitCost} ${currency} / ${match.unitLabel || labels.perUnit}` : labels.perUnit;
    default:
      return match.hourlyCost != null ? `${match.hourlyCost} ${currency}${labels.perHour}` : labels.noRate;
  }
}

/** Datalist entries: people first (grouped by role, with pay model + rate), then role defaults. */
export function presetOptions(people: PersonPreset[], roles: RolePreset[], currency: Currency, labels: PresetLabels): PresetOption[] {
  const peopleOptions = [...people]
    .sort((a, b) => (a.role ?? "").localeCompare(b.role ?? "") || a.name.localeCompare(b.name))
    .map((p) => {
      const match = resolvePreset(p.name, people, roles, currency);
      return { value: p.name, label: [p.role, match ? describe(match, currency, labels) : null].filter(Boolean).join(" · ") };
    });
  const roleOptions = roles.map((r) => ({
    value: r.name,
    label: `${labels.roleDefault} · ${r.currency === currency ? `${r.hourlyCost} ${currency}${labels.perHour}` : labels.noRate}`,
  }));
  return [...peopleOptions, ...roleOptions];
}
