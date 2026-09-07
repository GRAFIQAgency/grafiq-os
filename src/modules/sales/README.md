# Sales module (CRM pipeline v1)

Where companies saved from Sourcing become deals and, eventually, customers.
Answers "who are we selling to, how far along is it, what is the next step?".

- The deal IS the shared `company_leads` record owned by Sourcing. Sales never
  duplicates identity, signals, contacts, tags, scores, notes or activity.
- Pipeline membership = `company_leads.crm_status is not null`. The stage is
  that column (`prospect → contacted → qualified → proposal → negotiation →
  customer | lost`). Deal fields live 1:1 in `company_crm_details` (migration 0009).
- Entry points: "Save to CRM" in Sourcing and "Add company" here — both go
  through `sourcing/services/crm.ts` (`markInCrm`), so nothing is created twice.
- Exit point: a customer's "Create project" opens Projects → New with the
  client (and linked Pricing estimate) preselected.
- Dependency direction: sales → sourcing (services, queries, entity components),
  pricing (estimate list) and projects (`listProjectsByClient`). None of them
  import from sales.

```
types.ts / constants.ts   Stages, default probabilities, Deal, filters, stats, read-API shapes
services/pipeline.ts      Pure rules: join company + details, probability, weighted value,
                          overdue next action, stage transitions, filters, sorting, stats (tested)
services/filters.ts       URL params → filters / sort / view
validation.ts             Deal form + contact validation (tested)
queries.ts                listDeals, getDeal, contacts, projects, pickers
                          + read API: getPipelineStats, listCustomers, listPipelineCompanies
actions.ts                setDealStage, saveDealDetails, addContact, deleteContact, addCompanyToPipeline
components/               deal-filters, deals-table, pipeline-board, pipeline-stats, deal-detail,
                          deal-form, stage-controls, contacts-editor, add-company-sheet, stage-badge
```
