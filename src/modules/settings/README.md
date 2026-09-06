# Settings module (Business Settings v1)

Company-wide defaults that other modules read instead of hardcoding:
company name, default currency, VAT, margin thresholds, payment milestones
and default hourly role costs.

```
types.ts            BusinessSettings, MarginThresholds, RoleCost, inputs
constants.ts        DEFAULT_BUSINESS_SETTINGS (used until the row is saved)
services.ts         Pure helpers: payment-term sums, margin ordering, VAT maths. Tested.
services.test.ts    Vitest
validation.ts       Validates untrusted form payloads (messages passed in)
queries.ts          getBusinessSettings, getMarginThresholds, listRoleCosts, listActiveRoleCosts
actions.ts          saveBusinessSettings, saveRoleCost, setRoleCostActive, deleteRoleCost
components/         business-settings-form (client), role-costs-table (client)
```

Other modules should import from `queries.ts` (server) and `services.ts` (pure).
Never read `business_settings` / `role_costs` directly elsewhere.

Schema: `supabase/migrations/0003_business_settings.sql`.
