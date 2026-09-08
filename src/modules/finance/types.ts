import type { ProjectFinancials, ProjectHealth } from "@/modules/projects/types";
import type { MarginThresholds } from "@/modules/settings/types";
import type {
  CashDirection, Currency, FinanceAccountType, FinanceItemState, PayableCategory, ProjectStatus, RecurringCostCategory, RecurringFrequency,
} from "@/types/database";

export type { CashDirection, FinanceAccountType, FinanceItemState, PayableCategory, RecurringCostCategory, RecurringFrequency };

/** Anything grouped per currency. Finance never adds currencies together. */
export type ByCurrency<T> = Partial<Record<Currency, T>>;

// ---------------------------------------------------------------------------
// Stored entities
// ---------------------------------------------------------------------------

export interface FinanceAccount {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  currency: Currency;
  type: FinanceAccountType;
  /** Manual management balance as of `balanceAsOf`. */
  currentBalance: number;
  balanceAsOf: string;
  isActive: boolean;
  notes: string | null;
}

export interface Receivable {
  id: string;
  createdAt: string;
  updatedAt: string;
  projectId: string | null;
  projectName: string | null;
  clientId: string | null;
  clientName: string | null;
  label: string;
  /** Net (excl. VAT) — the part that reconciles with the project contract value. */
  netAmount: number;
  vatRate: number;
  /** Gross amount expected in the bank (net × (1 + VAT)). */
  amount: number;
  currency: Currency;
  dueDate: string;
  expectedDate: string | null;
  percentOfContract: number | null;
  invoiceReference: string | null;
  invoiceSentAt: string | null;
  notes: string | null;
  state: FinanceItemState;
  cancelledAt: string | null;
  position: number;
}

export interface Payable {
  id: string;
  createdAt: string;
  updatedAt: string;
  label: string;
  amount: number;
  currency: Currency;
  dueDate: string;
  projectId: string | null;
  projectName: string | null;
  talentCandidateId: string | null;
  supplierId: string | null;
  payeeName: string | null;
  category: PayableCategory;
  notes: string | null;
  state: FinanceItemState;
  cancelledAt: string | null;
}

export interface RecurringCost {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  category: RecurringCostCategory;
  amount: number;
  currency: Currency;
  frequency: RecurringFrequency;
  /** Next unpaid occurrence; advanced when a payment is recorded. */
  nextDueDate: string;
  isActive: boolean;
  notes: string | null;
}

export type CashEventKind = "receivable" | "payable" | "recurring" | "other";

export interface CashEvent {
  id: string;
  createdAt: string;
  direction: CashDirection;
  amount: number;
  currency: Currency;
  occurredAt: string;
  accountId: string | null;
  accountName: string | null;
  receivableId: string | null;
  payableId: string | null;
  recurringCostId: string | null;
  label: string;
  note: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  kind: CashEventKind;
}

// ---------------------------------------------------------------------------
// Derived views
// ---------------------------------------------------------------------------

export type ReceivableStatus = "scheduled" | "invoiced" | "partially_paid" | "paid" | "overdue" | "cancelled";
export type PayableStatus = "scheduled" | "partially_paid" | "paid" | "overdue" | "cancelled";
export type DueBucket = "overdue" | "due_soon" | "upcoming" | "paid" | "cancelled";

export interface ReceivableView extends Receivable {
  received: number;
  outstanding: number;
  status: ReceivableStatus;
  daysOverdue: number;
  bucket: DueBucket;
}

export interface PayableView extends Payable {
  paid: number;
  outstanding: number;
  status: PayableStatus;
  daysOverdue: number;
  bucket: DueBucket;
}

/** Cash we have right now in one currency (manual balances + events dated after the balance reference). */
export interface CashPosition {
  currency: Currency;
  /** Σ current_balance of active accounts. */
  balance: number;
  /** Σ cash events after each account's balance_as_of (and ≤ today). */
  adjustments: number;
  available: number;
  accounts: { id: string; name: string; balance: number; asOf: string; stale: boolean }[];
  /** True when at least one active account balance is older than the stale threshold. */
  stale: boolean;
  /** True when there is no active account in this currency (forecast starts from 0). */
  unknown: boolean;
}

export interface MonthForecast {
  /** "YYYY-MM" */
  month: string;
  starting: number;
  receivables: number;
  payables: number;
  recurring: number;
  inflows: number;
  outflows: number;
  ending: number;
}

export interface CashForecast {
  currency: Currency;
  horizonMonths: number;
  months: MonthForecast[];
  /** Forecast-based runway: cash stays positive in the horizon, or the first month it goes below zero. */
  runway: { kind: "positive"; months: number } | { kind: "negative"; month: string; ending: number };
  startingUnknown: boolean;
}

export type FinanceRiskCode =
  | "cash_below_zero" | "payable_before_receivable" | "overdue_receivable" | "stale_balance"
  | "unscheduled_revenue" | "over_scheduled" | "no_accounts";

export interface FinanceRisk {
  code: FinanceRiskCode;
  severity: "risk" | "warning";
  currency: Currency | null;
  params: Record<string, string | number>;
  /** Where to act. */
  href: string | null;
}

export interface ScheduleLine {
  label: string;
  percent: number;
  netAmount: number;
  vatRate: number;
  amount: number;
  dueDate: string;
}

/** Contract value (net, from Projects) vs the receivable schedule (net) of one project. */
export interface ContractReconciliation {
  currency: Currency;
  contractValue: number;
  baselineRevenue: number;
  approvedChangeRevenue: number;
  scheduledNet: number;
  scheduledGross: number;
  receivedGross: number;
  outstandingGross: number;
  /** contract − scheduled (positive: revenue not yet scheduled). */
  unscheduled: number;
  /** scheduled − contract when the schedule exceeds the contract. */
  overScheduled: number;
  nextDue: { label: string; amount: number; dueDate: string } | null;
  overdueCount: number;
  overdueAmount: number;
}

export interface ProjectProfitability {
  projectId: string;
  name: string;
  clientId: string | null;
  clientName: string | null;
  status: ProjectStatus;
  projectType: string;
  currency: Currency;
  deadline: string | null;
  completedAt: string | null;
  financials: ProjectFinancials;
  marginHealth: ProjectHealth;
}

export interface PortfolioTotals {
  currency: Currency;
  projects: number;
  revenue: number;
  directCost: number;
  grossProfit: number;
  /** total gross profit / total revenue — never an average of project margins. */
  grossMargin: number | null;
}

export interface ProfitabilityFilters {
  q?: string;
  status?: ProjectStatus;
  clientId?: string;
  projectType?: string;
  currency?: Currency;
  health?: ProjectHealth;
  scope?: "active" | "completed" | "all";
}

export interface CurrencyOverview {
  currency: Currency;
  cash: CashPosition;
  expectedIn30: number;
  expectedOut30: number;
  net30: number;
  overdueReceivables: number;
  overdueReceivableCount: number;
  unpaidPayables: number;
  unpaidPayableCount: number;
  activeProjects: number;
  forecastGrossProfit: number;
  forecastGrossMargin: number | null;
}

export interface FinanceOverview {
  currencies: CurrencyOverview[];
  risks: FinanceRisk[];
  hasAccounts: boolean;
}

export interface ReceivablesSummary {
  byCurrency: ByCurrency<{ outstanding: number; overdue: number; overdueCount: number; dueSoon: number; openCount: number }>;
}

export interface PayablesSummary {
  byCurrency: ByCurrency<{ outstanding: number; overdue: number; overdueCount: number; dueSoon: number; openCount: number }>;
}

export interface ItemFilters {
  q?: string;
  projectId?: string;
  clientId?: string;
  currency?: Currency;
  status?: string;
  dueBefore?: string;
  category?: string;
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface AccountInput {
  name: string;
  currency: Currency;
  type: FinanceAccountType;
  currentBalance: number;
  balanceAsOf: string;
  isActive: boolean;
  notes: string | null;
}

export interface ReceivableInput {
  projectId: string | null;
  clientId: string | null;
  clientName: string | null;
  label: string;
  netAmount: number;
  vatRate: number;
  currency: Currency;
  dueDate: string;
  expectedDate: string | null;
  percentOfContract: number | null;
  invoiceReference: string | null;
  invoiceSentAt: string | null;
  notes: string | null;
}

export interface PayableInput {
  label: string;
  amount: number;
  currency: Currency;
  dueDate: string;
  projectId: string | null;
  talentCandidateId: string | null;
  supplierId: string | null;
  payeeName: string | null;
  category: PayableCategory;
  notes: string | null;
}

export interface RecurringCostInput {
  name: string;
  category: RecurringCostCategory;
  amount: number;
  currency: Currency;
  frequency: RecurringFrequency;
  nextDueDate: string;
  isActive: boolean;
  notes: string | null;
}

export interface PaymentInput {
  amount: number;
  occurredAt: string;
  accountId: string | null;
  note: string | null;
}

export interface ScheduleInput {
  applyVat: boolean;
  vatRate: number;
  lines: { label: string; percent: number; netAmount: number; dueDate: string }[];
}

export interface ActionResult {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export type Thresholds = MarginThresholds;
