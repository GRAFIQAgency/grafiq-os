# Dashboard — Founder / company command centre v1

One question: **what needs our attention right now?** The Dashboard is an
aggregation and decision layer, not a business module: every number it shows is
produced by the module that owns it, and every item links back into that module.

```
src/modules/dashboard/
  services/
    attention.ts   module signals → one normalized, deterministically sorted feed
    timeline.ts    dated events from Projects / QA / Sales / Finance → today + next 7 days
    health.ts      module signals → five plain area statuses (no composite score)
    activity.ts    activity-log rows → links + a short detail line
    dashboard.test.ts
  components/      pulse, health strip, needs attention, timeline, module cards,
                   activity, quick actions, layout (mobile: problems first)
  queries.ts       one parallel pass over the module read APIs, with error isolation
  types.ts         DashboardAttentionItem, TimelineEvent, AreaHealth, Loaded<T>
  constants.ts     severity / source order, thresholds, limits, quick actions
```

Route: `src/app/(app)/dashboard/page.tsx` (thin: fetch + compose).

## What it reads (and never recomputes)

| Area | Source API |
| --- | --- |
| Projects, health, progress, deadlines | `projects`: `listProjectSummaries`, `listProjectDateEvents` |
| Pipeline, deals needing action | `sales`: `getPipelineStats`, `listSalesAttention`, `listSalesDateEvents` |
| Utilization, overload, free capacity | `capacity`: `getCapacityOverview` |
| QA counts and problem checklists | `qa`: `getQaStats`, `listQaAttentionItems`, `listQaDateEvents` |
| Cash, forecast, risks, portfolio margin | `finance`: `getFinanceOverview`, `getCashForecast`, `getPortfolioProfitability`, `listProjectProfitability`, `listFinanceDateEvents` |
| Company activity | `sourcing`: `listRecentActivity` |

Margins, health, utilization, QA state and cash forecasts are *carried*, never
recalculated. Portfolio margin is Finance's weighted total (Σ gross profit / Σ
revenue), never an average of project margins.

## Needs attention

Each signal becomes a `DashboardAttentionItem` with a severity:

- **critical** — a project whose health is critical, cash projected below zero,
  overdue receivables, a person above 120 % capacity.
- **high** — projects at risk, other cash risks, capacity overload, failed /
  blocked / overdue QA, a sales action more than 7 days overdue.
- **attention** — project health "attention", finance warnings, a sales action
  just overdue.
- **info** — QA ready for review, stale deals, unscheduled hours, people
  without a capacity number.

Sorting is deterministic (no AI): severity → source order (finance → projects →
capacity → qa → sales) → nearest date → largest amount. Project items render the
project's own health reasons; finance items keep the Finance sentence with its
own numbers.

## Currencies, unknown vs zero, failures

- Amounts are grouped per currency and never summed across them.
- `Loaded<T>` separates **ok**, **unconfigured** (no cash account, no capacity
  set, no checklists, no deals, no projects → a setup hint, never `0`) and
  **error**.
- Each module read is isolated: a failing module shows "data unavailable" in its
  own card while the rest of the page renders normally.

## Not here

No database tables (it is derived, read-only), no AI ranking, no role-specific
dashboards, no global date-range selector, no placeholder data.
