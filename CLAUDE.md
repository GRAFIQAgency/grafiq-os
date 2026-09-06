@AGENTS.md

# GRAFIQ OS — notes for coding sessions

- Read `docs/ARCHITECTURE.md` before adding or changing a module.
- Modules live in `src/modules/<name>/`; routes in `src/app/(app)/<name>/` stay thin.
- Register new modules in `src/config/modules.ts` — navigation derives from it.
- Server-first: Server Components + Server Actions via `@/lib/supabase/server`.
- Every new table needs a migration in `supabase/migrations/` with RLS policies.
- Keep components small, no business logic in UI, mark placeholder data clearly.
- All UI text goes through i18n: add keys to both `src/lib/i18n/dictionaries/en.ts` and `cs.ts`.
- THE GUIDE MUST STAY 1:1 WITH THE PRODUCT. Any new feature, changed workflow, renamed button or new module
  requires updating `src/modules/guide/content.ts` (steps + `data-guide` anchors) and the `guide` section in
  both dictionaries. `src/modules/guide/content.test.ts` fails when an active module has no steps or a step
  points to a missing route — treat that failure as "update the tutorial", never as "delete the test".
- Verify with `npm run lint`, `npm test` and `npm run build` before finishing.
