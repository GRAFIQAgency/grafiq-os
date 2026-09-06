# GRAFIQ OS — Architecture

This document explains how the codebase is organised and how it should be
extended. It is written for humans and for future AI coding sessions.

## Goals

- One internal app for a small agency (roughly 5–30 users).
- Add modules over time **without restructuring** what already exists.
- Prefer the simplest maintainable solution. Avoid abstraction until a second
  concrete use exists.

## Layers

```
┌───────────────────────────────────────────────────────────┐
│ src/app            Routes. Thin. Compose module components │
├───────────────────────────────────────────────────────────┤
│ src/modules/<x>    Feature code: UI, types, logic, data    │
├───────────────────────────────────────────────────────────┤
│ src/components     App shell (layout/), shared pieces,     │
│                    shadcn primitives (ui/)                 │
├───────────────────────────────────────────────────────────┤
│ src/config         Module registry, site config, env       │
│ src/lib            Supabase clients, utilities             │
│ src/types          Database row types                      │
└───────────────────────────────────────────────────────────┘
```

Dependency direction: `app → modules → components/config/lib/types`.
Modules may import shared components and other modules' **types**, but should
not import another module's components or actions. If two modules need the
same logic, move it to `src/lib` or a dedicated shared module.

## The module registry

`src/config/modules.ts` is the single source of truth for what modules exist:

```ts
{ id: "projects", title: "Projects", href: "/projects", icon: FolderKanban,
  description: "...", status: "planned", group: "modules" }
```

It feeds:

- the sidebar (`components/layout/sidebar-nav.tsx`), grouped by `group`;
- the top-bar title (`components/layout/page-title.tsx`) via `getModuleByPathname`;
- placeholder pages (`components/shared/module-placeholder.tsx`).

Changing a module's title, icon or order happens here and nowhere else.

## Anatomy of a module

```
src/modules/<name>/
  components/     React components used only by this module
  types.ts        Domain types (Project, Quote, …). Import DB row types from src/types
  services.ts     Pure business logic: calculations, status rules, formatting.
                  No React, no Supabase. Easy to unit test.
  queries.ts      Server-side reads via createClient() from lib/supabase/server
  actions.ts      "use server" mutations. Validate → write → revalidatePath/redirect
  validation.ts   Parse/validate FormData or JSON input
  data/           Static/placeholder data (remove when real data exists)
  README.md       Optional notes for the module
```

Create only the files a module needs. A module with no writes has no
`actions.ts`. Split files when they grow past roughly 200 lines; prefer several
small components over one large one.

### The `auth` module (existing)

- `queries.ts` — `getCurrentUser()` (cached per request) and `requireUser()`
  (redirects to login). Use `requireUser()` in any server code that needs the
  user; the `(app)` layout already calls it.
- `actions.ts` — `signIn` (used with `useActionState`) and `signOut`.
- `components/login-form.tsx` — the only client component in the module.

### The `dashboard` module (existing, placeholder)

`data/placeholder.ts` holds example numbers, clearly marked. When real modules
exist, add `queries.ts` that aggregates their data and delete the placeholder.

## Routing conventions

- `src/app/(auth)/…` — public pages (login). Chrome-free layout.
- `src/app/(app)/…` — authenticated pages. The layout calls `requireUser()`
  and renders `AppShell`.
- A module's routes live under its `href`, e.g. `(app)/projects/[id]/page.tsx`.
- Pages are Server Components by default. They fetch via module `queries.ts`
  and pass plain data to components. Mark a component `"use client"` only when
  it needs state, effects or browser APIs.
- Page `metadata.title` should match the module title.

## Authentication & authorisation

1. `src/proxy.ts` → `lib/supabase/proxy.ts` runs on every non-asset request.
   It refreshes the Supabase session cookie and redirects:
   - signed-out user on a protected route → `/login?next=<path>`
   - signed-in user on `/login` → `/dashboard`
2. `(app)/layout.tsx` calls `requireUser()` as a second check.
3. Postgres Row Level Security is the real security boundary. Every new table
   must enable RLS and define policies in its migration.

Roles: `profiles.role` is `'admin' | 'member'`. Nothing enforces roles in the
UI yet. When a module needs role checks, add a helper in `modules/auth`
(e.g. `requireRole("admin")`) rather than checking `profile.role` inline in
components.

## Data access

- Server: `import { createClient } from "@/lib/supabase/server"` inside
  Server Components, Server Actions and Route Handlers. Always `await` it.
- Browser: `import { createClient } from "@/lib/supabase/client"` only in
  client components that truly need it (realtime, file uploads).
- Types: `src/types/database.ts` is hand-written while the schema is tiny.
  Once a few tables exist, generate types with the Supabase CLI and pass
  `Database` as the generic to both client factories.
- Migrations: one SQL file per change in `supabase/migrations/`, numbered
  sequentially. Never edit an applied migration; add a new one.

## UI conventions

- shadcn/ui primitives live in `src/components/ui`. Add more with
  `npx shadcn@latest add <component>`. Do not hand-edit them beyond small
  tweaks; re-adding a component would overwrite changes.
- App-level building blocks (`PageHeader`, `PlaceholderBadge`, `EmptyPanel`)
  live in `src/components/shared`. Put a component there only when at least
  two modules use it.
- Theme tokens are CSS variables in `src/app/globals.css`. Use Tailwind
  semantic classes (`bg-card`, `text-muted-foreground`, `border`) rather than
  raw colours so the light theme keeps working.
- Style direction: minimal, neutral, generous spacing, subtle borders and
  hover states. No gradients, no decorative animation.
- Every page starts with `<PageHeader>` and wraps content in `space-y-*`.
- Example or placeholder data is always marked with `<PlaceholderBadge>`.

## Adding a module — checklist

1. Add the entry to `src/config/modules.ts` (or flip `status` to `"active"`).
2. Write the migration in `supabase/migrations/NNNN_<name>.sql` with RLS.
3. Add row types to `src/types/database.ts`.
4. Create `src/modules/<name>/` with `types.ts`, then `queries.ts`,
   `services.ts`, `actions.ts`, `validation.ts`, `components/` as needed.
5. Replace `<ModulePlaceholder>` in `src/app/(app)/<name>/page.tsx` with the
   module's components.
6. Delete the module's `README.md` placeholder or update it with real notes.
7. Run `npm run lint` and `npm run build`.

## Things deliberately not done yet

- No validation library (add `zod` when forms grow beyond login).
- No form library, global state, or data-fetching client.
- No theme toggle (dark is default; light tokens exist).
- No working search / command palette (top-bar search is a visual placeholder).
- No role enforcement, no admin user management UI.
- No tests. Add Vitest for `services.ts` files once real business logic exists.
