# GRAFIQ OS

Internal operating system for the GRAFIQ creative & digital agency. One modular
web app that grows module by module: Dashboard, Projects, Pricing, Capacity,
Talent, Sales, Finance, QA and Settings.

**Current phase: foundation only.** The app shell, authentication, navigation
and placeholder pages exist. No module functionality is implemented yet.

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, TypeScript, `src/` layout) |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix, "nova" preset, neutral palette) |
| Data & auth | Supabase (Postgres + Supabase Auth via `@supabase/ssr`) |
| Icons | lucide-react |

## 1. Running the project

Requirements: Node 20+ and npm.

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase values (see below)
npm run dev
```

Open http://localhost:3000. You will be redirected to `/login`.

Other scripts:

```bash
npm run build   # production build (also type-checks)
npm run start   # serve the production build
npm run lint    # ESLint
```

## 2. Configuring Supabase

1. Create a project at https://supabase.com/dashboard.
2. In **Project Settings → API** copy the **Project URL** and the
   **publishable key** (older projects show an **anon** key; both work).
3. Put them in `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

4. Run the migration in `supabase/migrations/0001_profiles.sql` in the
   **SQL Editor** (or `supabase db push` if you use the Supabase CLI). It creates
   the `profiles` table, a trigger that fills it for every new auth user, and
   Row Level Security policies.
5. Create users. This is an internal tool with **no public signup**: add team
   members in **Authentication → Users → Add user** (set a password, or send an
   invite). Optionally give them a `full_name` in the user metadata; it becomes
   the profile's display name.
6. In **Authentication → Providers → Email**, you may disable "Allow new users
   to sign up" so only admin-created accounts exist.

## 3. Project structure

```
src/
  app/                    Next.js routes only — thin pages that compose module components
    layout.tsx            Root layout: fonts, dark theme, global providers
    page.tsx              "/" → redirects to /dashboard
    (auth)/login/         Public login page
    (app)/                Authenticated area (layout checks the session, renders the shell)
      dashboard/ projects/ pricing/ capacity/ talent/ sales/ finance/ qa/ settings/
  proxy.ts                Next.js proxy (middleware): refreshes session, guards routes
  components/
    ui/                   shadcn/ui primitives (generated; safe to re-add/update via CLI)
    layout/               App shell: sidebar, top bar, user menu, mobile nav
    shared/               Small reusable pieces: page header, placeholder badge, empty panel…
  config/
    modules.ts            Module registry — single source of truth for nav + titles
    site.ts               App name and default routes
    env.ts                Environment variable access
  lib/
    supabase/             Supabase client factories (browser, server, proxy)
    utils.ts              `cn()` helper
  modules/                Feature modules (see below)
    auth/                 Login/logout actions, current-user queries, login form
    dashboard/            Placeholder dashboard widgets and example data
    projects/ pricing/ … Reserved folders with a README each
  types/
    database.ts           Database row types (hand-written for now)
supabase/
  migrations/             SQL migrations, applied manually or via Supabase CLI
docs/
  ARCHITECTURE.md         How the app is organised and how to extend it
```

## 4. Adding a new module

Short version (full details in `docs/ARCHITECTURE.md`):

1. **Register it** in `src/config/modules.ts` (id, title, href, icon, description).
   It appears in the sidebar and gets a page title automatically.
2. **Create the module folder** `src/modules/<name>/` with only what you need:
   `components/`, `types.ts`, `services.ts` (business logic), `queries.ts`
   (reads), `actions.ts` (writes, `"use server"`), `validation.ts`.
3. **Add the route** `src/app/(app)/<name>/page.tsx` and make it compose
   components from the module folder. Keep pages thin.
4. **Add the schema** as a new file in `supabase/migrations/` and extend
   `src/types/database.ts` (or switch to generated types).

## 5. Architectural decisions

- **Modules own their logic; routes only compose.** `src/app` stays thin so
  features can be found, tested and changed in one place.
- **Module registry drives navigation.** One list in `src/config/modules.ts`
  feeds the sidebar, top-bar title and placeholder pages. No duplicated nav data.
- **Server-first data access.** Server Components and Server Actions talk to
  Supabase through `src/lib/supabase/server.ts`. The browser client exists for
  the rare client-side need (realtime, uploads).
- **Auth in two layers.** `src/proxy.ts` redirects unauthenticated requests early;
  the `(app)` layout re-verifies with `requireUser()` so pages never render
  without a user. Row Level Security protects data at the database.
- **No public signup.** Users are created by an admin in the Supabase dashboard.
- **Dark theme by default**, with light tokens kept in `globals.css` so a toggle
  can be added later.
- **Minimal dependencies.** No form library, no validation library, no state
  manager. Add them when a module genuinely needs them.

## Documentation for future sessions

- `docs/ARCHITECTURE.md` — conventions and extension guide (read this first).
- `CLAUDE.md` / `AGENTS.md` — pointers for AI coding sessions.
