/**
 * Hand-written database types for the current (small) schema.
 *
 * When the schema grows, replace this file with generated types:
 *   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
 * and update the Supabase client factories to use `Database`.
 */

export type UserRole = "admin" | "member";

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}
