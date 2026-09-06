"use server";

import { redirect } from "next/navigation";

import { siteConfig } from "@/config/site";
import { createClient } from "@/lib/supabase/server";

import type { LoginFormState } from "./types";
import { validateLoginInput } from "./validation";

/** Only allow same-origin relative paths as post-login destinations. */
function safeRedirectPath(value: FormDataEntryValue | null): string {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//") ? path : siteConfig.defaultRoute;
}

export async function signIn(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const validated = validateLoginInput(formData);
  if (validated.errors) return validated.errors;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(validated.data);

  if (error) {
    return { error: "Invalid email or password." };
  }

  redirect(safeRedirectPath(formData.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(siteConfig.loginRoute);
}
