import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { listProjectAssignments } from "@/modules/projects/queries";
import { getTalentCapacityData } from "@/modules/talent/queries";
import type { ProfileCapacityDetailsRow, ProfileRow } from "@/types/database";

import { overview } from "./calculations/load";
import { monthPeriod, toDateString } from "./calculations/periods";
import { profileToCapacityPerson, talentToCapacityPerson } from "./services/people";
import type { CapacityDataset, CapacityOverview, CapacityPerson } from "./types";

type ProfileJoined = Pick<ProfileRow, "id" | "full_name" | "email"> & { profile_capacity_details: ProfileCapacityDetailsRow | ProfileCapacityDetailsRow[] | null };

/** Internal users with their optional capacity row. */
async function listInternalPeople(): Promise<CapacityPerson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id, full_name, email, profile_capacity_details(*)").order("full_name").returns<ProfileJoined[]>();
  if (error) {
    // Most likely migration 0011 is missing: fall back to profiles without capacity so the page still renders.
    console.error("[capacity] listInternalPeople failed:", error.message);
    const { data: plain } = await supabase.from("profiles").select("id, full_name, email").order("full_name").returns<Pick<ProfileRow, "id" | "full_name" | "email">[]>();
    return (plain ?? []).map((p) => profileToCapacityPerson(p, null));
  }
  return (data ?? []).map((p) => {
    const d = Array.isArray(p.profile_capacity_details) ? p.profile_capacity_details[0] ?? null : p.profile_capacity_details;
    return profileToCapacityPerson(p, d);
  });
}

/**
 * The whole Capacity input in three reads: Talent Bench people (Talent read
 * API), internal users (+ capacity row) and project assignments (Projects
 * read API). Archived Talent people are left out; everything else is derived.
 */
export const loadCapacityDataset = cache(async (): Promise<CapacityDataset> => {
  const [talent, internal, assignments] = await Promise.all([getTalentCapacityData(), listInternalPeople(), listProjectAssignments()]);
  const people = [
    ...talent.filter((t) => t.benchStatus !== "archived").map(talentToCapacityPerson),
    ...internal,
  ];
  return { people, assignments };
});

export async function getCapacityPerson(key: string): Promise<CapacityPerson | null> {
  const data = await loadCapacityDataset();
  return data.people.find((p) => p.key === key) ?? null;
}

/** Internal capacity row for the configuration form. */
export async function getProfileCapacity(profileId: string): Promise<ProfileCapacityDetailsRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profile_capacity_details").select("*").eq("profile_id", profileId).maybeSingle<ProfileCapacityDetailsRow>();
  return data ?? null;
}

// ---------------------------------------------------------------------------
// Read API for Dashboard (keep stable)
// ---------------------------------------------------------------------------

/** Current month: overall utilization, overloaded count, available hours, most free people. */
export async function getCapacityOverview(): Promise<CapacityOverview> {
  const data = await loadCapacityDataset();
  return overview(data, monthPeriod(toDateString(new Date())));
}
