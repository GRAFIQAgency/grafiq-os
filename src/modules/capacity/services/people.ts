import type { TalentCapacityRecord } from "@/modules/talent/types";
import type { ProfileCapacityDetailsRow, ProfileRow } from "@/types/database";

import type { CapacityPerson } from "../types";
import { personKeyOf } from "../calculations/load";

/**
 * Builds Capacity people from the two identity sources. Pure, tested via the
 * calculations; the mapping rules are:
 *
 * Talent Bench person (owned by Talent, read through listActiveTalent):
 *   capacity = preferred monthly workload, else maximum monthly capacity, else none
 *   availability / available-from / bench status come straight from Talent
 *
 * Internal user (auth profile + optional profile_capacity_details):
 *   capacity = preferred_monthly_hours, else monthly_capacity_hours, else none
 *   capacity_active = false → unavailable for planning
 */
export function talentToCapacityPerson(t: TalentCapacityRecord): CapacityPerson {
  const monthly = t.preferredMonthlyHours ?? t.maxMonthlyHours ?? null;
  return {
    key: personKeyOf("talent", t.id), kind: "talent", id: t.id, name: t.fullName, role: t.role,
    availability: t.availability, availableFrom: t.availableFrom, benchStatus: t.benchStatus, capacityActive: true,
    monthlyCapacity: monthly, monthlyMaximum: t.maxMonthlyHours,
    capacitySource: t.preferredMonthlyHours != null ? "preferred" : t.maxMonthlyHours != null ? "maximum" : "none",
    pricingModel: t.pricingModel,
  };
}

export function profileToCapacityPerson(p: Pick<ProfileRow, "id" | "full_name" | "email">, d: ProfileCapacityDetailsRow | null): CapacityPerson {
  const monthly = d ? d.preferred_monthly_hours ?? d.monthly_capacity_hours : null;
  return {
    key: personKeyOf("user", p.id), kind: "user", id: p.id, name: p.full_name?.trim() || p.email, role: null,
    availability: null, availableFrom: null, benchStatus: null, capacityActive: d ? d.capacity_active : true,
    monthlyCapacity: monthly, monthlyMaximum: d?.monthly_capacity_hours ?? null,
    capacitySource: d ? "internal" : "none",
    pricingModel: null,
  };
}

/** Parses `talent:<id>` / `user:<id>`. */
export function parsePersonKey(key: string): { kind: "talent" | "user"; id: string } | null {
  const [kind, id] = key.split(":");
  if ((kind === "talent" || kind === "user") && id) return { kind, id };
  return null;
}
