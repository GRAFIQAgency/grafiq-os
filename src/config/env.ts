/**
 * Central place for reading environment variables.
 * Keeps `process.env` access out of the rest of the codebase and
 * fails loudly with a helpful message when configuration is missing.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`
    );
  }
  return value;
}

export function getSupabaseEnv() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    // Newer Supabase projects issue "publishable" keys; older ones use the "anon" key.
    key: required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
  };
}
