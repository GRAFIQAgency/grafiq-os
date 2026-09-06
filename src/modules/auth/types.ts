import type { User } from "@supabase/supabase-js";

import type { ProfileRow } from "@/types/database";

export type Profile = ProfileRow;

/** The signed-in user together with their app profile (if one exists yet). */
export interface CurrentUser {
  user: User;
  profile: Profile | null;
  /** Best available display name, falling back to the email address. */
  displayName: string;
  /** 1–2 uppercase characters for avatar fallbacks. */
  initials: string;
}

export interface LoginFormState {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
}
