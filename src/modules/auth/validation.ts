import type { LoginFormState } from "./types";

export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Minimal, dependency-free validation for the login form.
 * If validation needs grow (future modules), introduce `zod` and keep the
 * same shape: a function that returns either parsed data or field errors.
 */
export function validateLoginInput(
  formData: FormData
): { data: LoginInput; errors?: undefined } | { data?: undefined; errors: LoginFormState } {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const fieldErrors: NonNullable<LoginFormState["fieldErrors"]> = {};
  if (!email) fieldErrors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "Enter a valid email address.";
  if (!password) fieldErrors.password = "Password is required.";

  if (Object.keys(fieldErrors).length > 0) {
    return { errors: { fieldErrors } };
  }
  return { data: { email, password } };
}
