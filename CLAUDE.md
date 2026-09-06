@AGENTS.md

# GRAFIQ OS — notes for coding sessions

- Read `docs/ARCHITECTURE.md` before adding or changing a module.
- Modules live in `src/modules/<name>/`; routes in `src/app/(app)/<name>/` stay thin.
- Register new modules in `src/config/modules.ts` — navigation derives from it.
- Server-first: Server Components + Server Actions via `@/lib/supabase/server`.
- Every new table needs a migration in `supabase/migrations/` with RLS policies.
- Keep components small, no business logic in UI, mark placeholder data clearly.
- Verify with `npm run lint`, `npm test` and `npm run build` before finishing.
