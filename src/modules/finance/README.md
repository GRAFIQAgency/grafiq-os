# Finance — Management Finance & Cash Flow v1

The management cockpit of GRAFIQ, **not** accounting software. It answers:
how profitable are our projects, what money should come in and go out, what
is overdue, what cash do we have now, where will it be in the next months,
and which financial risks need action.

```
src/modules/finance/
  calculations/
    dates.ts        ISO date helpers (add days / months, month keys)
    status.ts       outstanding, derived receivable / payable status, buckets, payment guard
    schedule.ts     payment-schedule generation, VAT gross, contract reconciliation
    recurring.ts    recurring-cost occurrence expansion, next due after payment
    forecast.ts     cash position (current balance rule) and monthly cash forecast
    risk.ts         explainable risk signals
    portfolio.ts    weighted portfolio totals, margin health, profitability filters
    overview.ts     overview cards per currency, receivable / payable summaries, item filters
    payee.ts        "Create payable" amount from the project member's pay-model snapshot
    finance.test.ts 31 rule tests (Vitest)
  actions/          Server Actions: accounts, receivables (+ schedule), payables, recurring, payments (+ void, other movements)
  components/       tabs, overview cards, risks, accounts, forecast, ledger, receivable / payable lists + forms,
                    payment form, recurring costs, profitability table, schedule generator, project finance page,
                    project payments panel (slot for the project's Financials tab)
  services/filters.ts   URL params → filters
  queries.ts        Supabase reads + the read API (getFinanceOverview, getCashForecast, getReceivablesSummary,
                    getPayablesSummary, getPortfolioProfitability, getFinanceAlerts, getProjectFinance …)
  validation.ts     account / receivable / payable / recurring / payment / schedule validation (pure, messages passed in)
  mappers.ts, types.ts, constants.ts
```

Routes: `/finance` (overview), `/finance/cashflow`, `/finance/receivables`,
`/finance/payables`, `/finance/costs`, `/finance/profitability`,
`/finance/projects/[id]` (payments of one project).

## Profitability vs cash flow (the one rule that matters)

| | Profitability | Cash flow |
| --- | --- | --- |
| Question | What did the project earn economically? | When does money actually enter / leave? |
| Source of truth | **Projects** (`computeFinancials`, via `listProjectFinancials()`) | **Finance** receivables, payables, recurring costs, cash events |
| VAT | excluded | gross cash (net × (1 + VAT)) |
| Used for | Profitability tab, portfolio totals, overview GP / GM cards | Overview cash cards, forecast, risks, receivable / payable views |

Cash received is never treated as revenue. Finance never recomputes project
economics; `portfolio.ts` only adds `ProjectFinancials` up per currency
(weighted margin = Σ gross profit / Σ revenue, never an average of margins).

## Project source-of-truth rule

Contract value = baseline revenue + approved change-request revenue, read from
Projects. Member pay is read from the member's **snapshot** on the project
(`cost_rate`, `fixed_cost`, `percent`, `unit_cost`): `payee.ts` suggests a
payable amount from that snapshot through Projects' own `memberCurrentFee`.
Today's Talent rates are never consulted.

## Data (migration `0016_finance.sql`)

- `finance_accounts` — name, currency, type, **manual** `current_balance` + `balance_as_of`, active.
- `finance_receivables` — project / client (FK + name snapshots), label, `net_amount`, `vat_rate`,
  `amount` (gross), currency, due / expected date, % of contract, invoice reference / sent date,
  `status` open | cancelled (soft), position.
- `finance_payables` — label, amount, currency, due date, project / talent / supplier (FK + snapshots),
  category, `status` open | cancelled.
- `finance_recurring_costs` — name, category, amount, currency, frequency, `next_due_date`, active.
- `finance_cash_events` — direction, amount, currency, `occurred_at`, account, at most one of
  receivable / payable / recurring cost, label snapshot, `voided_at` + reason. A trigger rejects an
  event whose currency differs from the linked item or account.

RLS: every authenticated user may manage all five tables (single company).

## Receivables and payables

Status is **derived**, never stored: `received = Σ non-voided IN events`,
`outstanding = expected − received`; `paid` when outstanding is 0, `overdue`
when due date < today and outstanding > 0, `partially_paid` when something was
received, `invoiced` when an invoice reference / sent date exists, otherwise
`scheduled`; `cancelled` is the soft state. Payables work the same with OUT
events. A payment can never exceed the outstanding amount (`paymentAllowed`).
Rows with payments cannot be deleted — only cancelled; voided events stay in
the ledger.

## Payment schedule (snapshot)

`generateSchedule(contractValue, terms, …)` splits the contract value by the
Business Settings payment terms (rounding to the last line so the sum is
exact), applies VAT if chosen, and proposes due dates (today → project
deadline, or every 30 days). The user edits and confirms; rows are written as
receivables of the project. **Nothing regenerates them later**: changing
Settings or approving a change request only makes `reconcileContract` warn
(`unscheduled` / `overScheduled`). Proposals currently carry no explicit
payment terms, so Settings are the only prefill source.

## Cash forecast rules

- **Current balance rule** — `available = Σ active account balances + Σ cash
  events dated after the account's `balance_as_of` (≤ today)`. Events without
  an account use the newest as-of date of that currency. Earlier events are
  assumed to be inside the typed balance (no reconciliation).
- **Monthly forecast** — per currency, N ∈ {3, 6, 12}: starting cash (first
  month = available) + outstanding receivables by expected/due date −
  outstanding payables by due date − recurring occurrences = ending; next
  month starts from it. Overdue items land in the current month.
- **Runway** — "positive for N months" or "cash risk in <month>" (first month
  with ending < 0). No accounting-style runway.
- Sales pipeline deals and pricing estimates are not inputs.

## Recurring costs

One definition per cost; `expandOccurrences` derives future dates from
`next_due_date` and the frequency. Recording a payment writes the OUT event and
advances `next_due_date` (voiding steps it back), so a paid occurrence is never
forecast again.

## Currencies

CZK / EUR / USD. Every number is grouped per currency; nothing is converted or
summed across currencies (no FX in v1). A cash event must match the currency of
its receivable / payable / account (DB trigger); a receivable's currency is
locked to its project.

## VAT

Profitability stays net. When a receivable is created, `net_amount` +
`vat_rate` (default from Settings, editable, may be 0) are snapshotted and
`amount` = gross cash expected. Reconciliation compares **net** amounts with
the contract value. No VAT accounting or returns.

## Limitations

No FX, no invoicing / PDFs, no bank sync or transaction matching, no payroll,
no probability-weighted pipeline cash, no accountant statements. The Dashboard
still shows example data; it can call the read API listed above.
