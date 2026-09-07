# Capacity module (Capacity Planner v1)

Answers "who has capacity, when, and can GRAFIQ safely take on more work?".
Capacity is a DERIVED planning layer: it reads Talent and Projects and stores
nothing calculated. The only persistent data it owns is the monthly capacity of
internal users (`profile_capacity_details`, migration 0011).

## What it reads

- **Talent** (`modules/talent/queries.ts` → `getTalentCapacityData`): every
  bench person with role, availability, available-from, bench status,
  preferred monthly workload, maximum monthly capacity and pay model.
  Preferred workload = planning capacity; maximum = fallback; neither = "not
  configured" (never invented). Archived people are skipped; paused /
  unavailable people and Talent availability "unavailable" count as 0 h.
- **Projects** (`modules/projects/queries.ts` → `listProjectAssignments`):
  one row per member of a project in delivery (onboarding, active, waiting
  for client, internal review) with planned hours, assignment dates, project
  dates and the member's tasks (estimate, start, due). Draft, on-hold and
  closed projects never consume capacity; removed members are ignored.
- **Internal users**: `profiles` + optional `profile_capacity_details`
  (monthly capacity, preferred hours, active flag). They are never converted
  into Talent records.

## How hours are calculated (`calculations/`)

```
booking.ts      per assignment: workload = max(planned hours, Σ task estimates)
                task hours → placed by task dates (fallback assignment, then project dates)
                remainder (workload − task hours) → placed by assignment dates (fallback project)
                no dates at any level → UNSCHEDULED (shown, never placed)
periods.ts      months, ISO weeks, ranges; Mon–Fri working days;
                distributeHours() splits hours proportionally by working days
availability.ts period capacity from the monthly number (week = monthly × 12/52),
                prorated by working days after available-from; unavailable → 0
health.ts       utilization %, bands (75 / 90 / 100 % from constants.ts), free capacity
load.ts         PersonLoad (per person × period), summary, filters, projects view,
                forward-planning matrix, dashboard overview, warnings
whatif.ts       non-persisted simulation: person or role, hours, date range
```

Pay model (hourly / fixed / percent) never enters the maths — capacity is time.

## Structure

```
types.ts / constants.ts     domain types, thresholds, counting statuses
calculations/               pure, tested (periods.test.ts, capacity.test.ts)
services/people.ts          Talent record / profile → CapacityPerson
services/filters.ts         URL params → filters, period kind, view, horizon, what-if
services/links.ts           URL builders (period/person links)
services/format.ts          period labels, hours, percent
queries.ts                  loadCapacityDataset (3 reads), getCapacityOverview (Dashboard read API)
actions.ts / validation.ts  saveInternalCapacity (the only write)
components/                 period-nav, summary-strip, capacity-filters, people-table (desktop + mobile),
                            projects-view, planning-matrix, whatif-panel, person-detail, warnings-list,
                            internal-capacity-form, health-badge
```

Routes: `/capacity` (overview, filters, people/projects view, matrix, what-if)
and `/capacity/[key]` (person detail; key = `talent:<id>` or `user:<id>`).
Dependency direction: capacity → talent / projects read APIs; nothing imports capacity except the Projects team tab link.
