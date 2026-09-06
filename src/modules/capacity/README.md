# Capacity module

Not implemented yet. This folder is reserved for the Capacity module.

When building it, follow the layout described in `docs/ARCHITECTURE.md`:

```
src/modules/capacity/
  components/   UI specific to this module
  types.ts      Domain types
  services.ts   Business logic (pure functions, no React)
  queries.ts    Supabase reads (server-side)
  actions.ts    Server Actions for writes ("use server")
  validation.ts Input validation for forms/actions
```

The route lives at `src/app/(app)/capacity/page.tsx` and should only compose
components from this folder.
