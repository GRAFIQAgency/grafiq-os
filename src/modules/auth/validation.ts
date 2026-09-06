import type { LoginFormState } from "./types";

export interface LoginInput {
  email: string;
  password: string;
}

/** Translated messages the validator can emit (a subset of dict.auth). */
export interface LoginMessages {
  emailRequired: string;
  emailInvalid: string;
  passwordRequired: string;
}

/**
 * Minimal, dependency-free validation for the login form.
 * If validation needs grow (future modules), introduce `zod` and keep the
 * same shape: a function that returns either parsed data or field errors.
 */
export function validateLoginInput(
  formData: FormData,
  messages: LoginMessages
): { data: LoginInput; errors?: undefined } | { data?: undefined; errors: LoginFormState } {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const fieldErrors: NonNullable<LoginFormState["fieldErrors"]> = {};
  if (!email) fieldErrors.email = messages.emailRequired;
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = messages.emailInvalid;
  if (!password) fieldErrors.password = messages.passwordRequired;

  if (Object.keys(fieldErrors).length > 0) {
    return { errors: { fieldErrors } };
  }
  return { data: { email, password } };
}
