import type { CapacityOverview } from "@/modules/capacity/types";
import type { CashForecast, CurrencyOverview, FinanceRisk, PortfolioTotals } from "@/modules/finance/types";
import type { ProjectSummary } from "@/modules/projects/queries";
import type { PipelineStats } from "@/modules/sales/types";
import type { QaAttentionItem, QaStats } from "@/modules/qa/types";
import type { RecentActivityEntry } from "@/modules/sourcing/queries/activity";
import type { Currency } from "@/types/database";

/**
 * Dashboard types. This module aggregates and presents; every number it shows
 * is produced by the module that owns it (Projects, Sales, Capacity, QA,
 * Finance). Nothing here recomputes domain logic.
 */

export type DashboardSource = "finance" | "projects" | "capacity" | "qa" | "sales";
export type DashboardSeverity = "critical" | "high" | "attention" | "info";

/** A reason rendered from the SOURCE module's own dictionary (e.g. dict.projects.healthReasons). */
export interface AttentionReason {
  code: string;
  params: Record<string, string | number>;
}

/**
 * One normalized item of the attention feed. `textSource` says which
 * dictionary holds the sentence: "dashboard" for Dashboard-owned wording,
 * "finance" to reuse the Finance risk sentence verbatim.
 */
export interface DashboardAttentionItem {
  id: string;
  source: DashboardSource;
  severity: DashboardSeverity;
  textSource: "dashboard" | "finance";
  /** Key inside dashboard.attention.<code> or finance.risks.<code>. */
  code: string;
  params: Record<string, string | number>;
  /** Reasons rendered from the source module's dictionary; empty for most items. */
  reasons: AttentionReason[];
  /** Reason dictionary to use, when `reasons` is not empty. */
  reasonSource?: "projects";
  href: string;
  date: string | null;
  value: { amount: number; currency: Currency } | null;
  /** Currency of a Finance risk, needed to format its own sentence. */
  currency: Currency | null;
}

export type TimelineKind = "project_deadline" | "milestone" | "qa_due" | "sales_action" | "receivable" | "payable";

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  source: DashboardSource;
  title: string;
  subject: string | null;
  date: string;
  href: string;
  overdue: boolean;
  value: { amount: number; currency: Currency } | null;
}

export type HealthArea = "sales" | "delivery" | "capacity" | "qa" | "finance";
export type HealthStatus = "healthy" | "attention" | "risk" | "unknown";

export interface AreaHealth {
  area: HealthArea;
  status: HealthStatus;
  /** Key inside dashboard.health.reasons.<code>. */
  code: string;
  params: Record<string, string | number>;
  href: string;
}

/**
 * Result of one module read. `unconfigured` means the module has no setup yet
 * (show a setup hint, never a zero); `error` means the read failed and the
 * rest of the Dashboard must still render.
 */
export type Loaded<T> =
  | { state: "ok"; data: T }
  | { state: "unconfigured"; data: T }
  | { state: "error"; data: null };

export interface DashboardProjects {
  summaries: ProjectSummary[];
  active: number;
  atRisk: number;
  critical: number;
  dueThisWeek: number;
  waitingClient: number;
  internalReview: number;
  completedThisMonth: number;
  /** Projects in delivery that need attention, worst first (already limited). */
  attention: ProjectSummary[];
}

export interface DashboardFinance {
  currencies: CurrencyOverview[];
  risks: FinanceRisk[];
  hasAccounts: boolean;
  forecast: CashForecast[];
  portfolio: PortfolioTotals[];
  /** Projects below the Settings margin thresholds (health from Finance). */
  lowMargin: { projectId: string; name: string; clientName: string | null; currency: Currency; margin: number | null; health: string }[];
}

export interface DashboardData {
  today: string;
  projects: Loaded<DashboardProjects>;
  sales: Loaded<PipelineStats>;
  salesAttentionCount: number;
  capacity: Loaded<CapacityOverview>;
  qa: Loaded<QaStats>;
  /** Checklists behind the QA numbers (not capped by the attention feed). */
  qaItems: QaAttentionItem[];
  finance: Loaded<DashboardFinance>;
  activity: Loaded<RecentActivityEntry[]>;
  attention: DashboardAttentionItem[];
  timeline: { today: TimelineEvent[]; week: TimelineEvent[] };
  health: AreaHealth[];
  /** Sources whose read failed — used to show "data unavailable" per card. */
  failed: DashboardSource[];
}

/** A link in the Quick actions row; `moduleId` must be an ACTIVE module. */
export interface QuickAction {
  id: string;
  href: string;
  moduleId: "pricing" | "projects" | "sales" | "sourcing" | "finance" | "qa";
}
