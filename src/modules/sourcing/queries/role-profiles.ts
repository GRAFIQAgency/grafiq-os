import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { TalentRoleProfileRow } from "@/types/database";

import type { RoleProfile } from "../types";
import { rowToRoleProfile } from "./mappers";

export async function listRoleProfiles(client?: SupabaseClient): Promise<RoleProfile[]> {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase.from("talent_role_profiles").select("*").eq("is_active", true).order("name").returns<TalentRoleProfileRow[]>();
  if (error) {
    console.error("[sourcing] listRoleProfiles failed:", error.message);
    return [];
  }
  return (data ?? []).map(rowToRoleProfile);
}

export async function getRoleProfile(id: string | null): Promise<RoleProfile | null> {
  if (!id) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("talent_role_profiles").select("*").eq("id", id).maybeSingle<TalentRoleProfileRow>();
  return data ? rowToRoleProfile(data) : null;
}

/** Best-effort profile for a role name (e.g. candidate.role), used for automatic scoring. */
export async function findRoleProfileForRole(role: string | null, client?: SupabaseClient): Promise<RoleProfile | null> {
  if (!role) return null;
  const profiles = await listRoleProfiles(client);
  const needle = role.toLowerCase();
  return profiles.find((p) => p.role.toLowerCase() === needle) ?? profiles.find((p) => needle.includes(p.role.toLowerCase())) ?? null;
}
