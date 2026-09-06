import { cache } from "react";
import { redirect } from "next/navigation";

import { siteConfig } from "@/config/site";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/database";

import type { CurrentUser } from "./types";

function toInitials(name: string) {
  const parts = name.replace(/@.*$/, "").split(/[\s._-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return letters.join("") || "?";
}

/**
 * Returns the signed-in user with their profile, or null.
 * Wrapped in `cache` so multiple calls within one request hit Supabase once.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  const displayName = profile?.full_name?.trim() || user.email || "Unknown user";

  return {
    user,
    profile: profile ?? null,
    displayName,
    initials: toInitials(displayName),
  };
});

/** Like `getCurrentUser`, but redirects to the login page when signed out. */
export async function requireUser(): Promise<CurrentUser> {
  const current = await getCurrentUser();
  if (!current) redirect(siteConfig.loginRoute);
  return current;
}
