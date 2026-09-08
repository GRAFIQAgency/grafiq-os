import type { DueBucket, FinanceAccountType, PayableCategory, PayableStatus, ReceivableStatus, RecurringCostCategory, RecurringFrequency } from "./types";

export const RECEIVABLE_STATUSES: readonly ReceivableStatus[] = ["scheduled", "invoiced", "partially_paid", "paid", "overdue", "cancelled"];
export const PAYABLE_STATUSES: readonly PayableStatus[] = ["scheduled", "partially_paid", "paid", "overdue", "cancelled"];
export const DUE_BUCKETS: readonly DueBucket[] = ["overdue", "due_soon", "upcoming", "paid", "cancelled"];
export const ACCOUNT_TYPES: readonly FinanceAccountType[] = ["bank", "cash", "other"];
export const PAYABLE_CATEGORIES: readonly PayableCategory[] = [
  "freelancer", "subcontractor", "software", "printing", "photography", "equipment", "accounting", "legal", "office", "marketing", "hosting", "insurance", "other",
];
export const RECURRING_CATEGORIES: readonly RecurringCostCategory[] = ["software", "accounting", "office", "rent", "phone", "hosting", "insurance", "marketing", "legal", "other"];
export const FREQUENCIES: readonly RecurringFrequency[] = ["monthly", "quarterly", "yearly"];

/** Forecast horizons offered in the UI (months). */
export const FORECAST_HORIZONS = [3, 6, 12] as const;
export const DEFAULT_HORIZON = 6;

/** An account balance older than this many days is flagged as stale. */
export const STALE_BALANCE_DAYS = 14;
/** Items due within this many days are "due soon". */
export const DUE_SOON_DAYS = 14;
/** Window of the overview cards ("expected incoming — next 30 days"). */
export const OVERVIEW_WINDOW_DAYS = 30;
/** Default gap between generated schedule instalments when the project has no deadline. */
export const SCHEDULE_GAP_DAYS = 30;

export const FINANCE_LIST_LIMIT = 500;
export const CASH_ACTIVITY_LIMIT = 40;
