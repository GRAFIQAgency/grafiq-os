# Talent module (Talent Bench v1)

Operational bench of people GRAFIQ has already saved from Sourcing.
Answers "who do we have available to do this work?".

- The person is the shared `talent_candidates` record owned by Sourcing.
  Talent never duplicates identity, skills, links, ratings, notes or sources.
- Bench membership = `talent_candidates.in_talent_bench`. Operational fields
  live 1:1 in `talent_bench_details` (migration 0007).
- Dependency direction: talent → sourcing services/components. Sourcing never
  imports from talent.

```
types.ts / constants.ts   Bench statuses, engagement types, TalentPerson, filters
services/bench.ts         Pure rules: join person + details, cost fallback, availability, archive/restore, filters, sorting (tested)
services/filters.ts       URL params → filters/sort
validation.ts             Bench details form validation
queries.ts                listBench, getBenchPerson + read API for future modules:
                          listActiveTalent, listAvailableTalent, listTalentByRole, getTalentCapacityData
actions.ts                saveBenchDetails, archiveFromBench, restoreToBench, addPersonToBench (same pipeline as Sourcing manual add),
                          setPersonRate / addPersonWithRate (Settings → People rates)
components/               talent-filters, talent-table, talent-detail, bench-details-form, bench-status-controls, add-person-sheet,
                          people-rates-table (rendered on the Settings page; Pricing reads the rates via listActiveTalent)
```
