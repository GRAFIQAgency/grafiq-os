# Pricing module (v1)

Pricing / profit calculator: enter a client price and the internal cost lines,
see gross margin, recommended price and a health status; save and reopen
estimates.

```
calculations.ts       Pure maths (profit, margin, recommended price, health). Unit-tested.
calculations.test.ts  Vitest tests — run with `npm test`.
constants.ts          Fallback role names, list limit. (Thresholds/defaults live in Settings.)
types.ts              Domain types (EstimateInput, PricingSummary, …).
draft.ts              Form-state helpers (string inputs ⇄ numeric EstimateInput).
format.ts             Money / percent / date formatting.
mappers.ts            DB rows → EstimateInput / list rows.
validation.ts         Validates untrusted save payloads.
queries.ts            Server reads: getEstimate, listRecentEstimates.
actions.ts            Server Action: saveEstimate (create or update).
components/           pricing-calculator (client, owns state), project-info-form,
                      cost-items-table + cost-item-row, financial-summary,
                      health-badge, recent-estimates (server).
```

Route: `src/app/(app)/pricing/page.tsx` — loads `?estimate=<id>` when present,
passes it into the calculator and renders the recent list.

Schema: `supabase/migrations/0002_pricing.sql` (`pricing_estimates`, `pricing_cost_items`).

Health thresholds, default target margin, default currency and role presets
are read from Business Settings (`@/modules/settings/queries`) in the page and
passed to the calculator. Change them in Settings → Business.
