import type { DashboardSeverity, DashboardSource, QuickAction } from "./types";

/** Severity order of the attention feed (index 0 first). */
export const SEVERITY_ORDER: readonly DashboardSeverity[] = ["critical", "high", "attention", "info"];

/**
 * Tie-break inside one severity: money that already left or is owed first,
 * then delivery risk, then people, then quality, then sales follow-ups.
 */
export const SOURCE_ORDER: readonly DashboardSource[] = ["finance", "projects", "capacity", "qa", "sales"];

/** Finance risk codes that are always critical (money already lost or about to run out). */
export const CRITICAL_FINANCE_CODES: readonly string[] = ["cash_below_zero", "overdue_receivable"];

/** Utilization at or above this makes an overload critical rather than high. */
export const CRITICAL_UTILIZATION = 120;
/** Utilization at or above this (without overload) makes capacity "attention". */
export const CAPACITY_ATTENTION_UTILIZATION = 95;
/** A sales next action overdue by this many days is raised from attention to high. */
export const SALES_OVERDUE_HIGH_DAYS = 7;

export const ATTENTION_LIMIT = 12;
export const PROJECT_ATTENTION_LIMIT = 6;
export const TIMELINE_DAYS = 7;
export const TIMELINE_LIMIT = 14;
export const ACTIVITY_LIMIT = 15;

/** Only real, existing routes of ACTIVE modules. */
export const QUICK_ACTIONS: readonly QuickAction[] = [
  { id: "estimate", href: "/pricing", moduleId: "pricing" },
  { id: "project", href: "/projects/new", moduleId: "projects" },
  { id: "prospect", href: "/sales", moduleId: "sales" },
  { id: "talent", href: "/sourcing/talent", moduleId: "sourcing" },
  { id: "receivable", href: "/finance/receivables", moduleId: "finance" },
  { id: "qa", href: "/qa", moduleId: "qa" },
];
