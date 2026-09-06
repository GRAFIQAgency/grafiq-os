# Sales module

Not implemented yet. This folder is reserved for the Sales module.

When building it, follow the layout described in `docs/ARCHITECTURE.md`:

```
src/modules/sales/
  components/   UI specific to this module
  types.ts      Domain types
  services.ts   Business logic (pure functions, no React)
  queries.ts    Supabase reads (server-side)
  actions.ts    Server Actions for writes ("use server")
  validation.ts Input validation for forms/actions
```

The route lives at `src/app/(app)/sales/page.tsx` and should only compose
components from this folder.
