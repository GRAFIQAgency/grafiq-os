import { cache } from "react";

import { CURRENCIES } from "@/config/currencies";
import { getModule } from "@/config/modules";
import { createClient } from "@/lib/supabase/server";
import { getProjectDetail, listProjectFinancials } from "@/modules/projects/queries";
import type { ProjectDetail } from "@/modules/projects/types";
import { getBusinessSettings, getMarginThresholds } from "@/modules/settings/queries";
import type { BusinessSettings } from "@/modules/settings/types";
import { listActiveTalent } from "@/modules/talent/queries";
import type { Currency, FinanceAccountRow, FinanceCashEventRow, FinancePayableRow, FinanceReceivableRow, FinanceRecurringCostRow } from "@/types/database";

import { isoToday } from "./calculations/dates";
import { buildForecast, cashPosition, currenciesInUse } from "./calculations/forecast";
import { currencyOverview, payablesSummary, receivablesSummary } from "./calculations/overview";
import { suggestPayableAmount, type PayableSuggestion } from "./calculations/payee";
import { isInDelivery, marginHealth, portfolioTotals, type ProfitabilityView } from "./calculations/portfolio";
import { financeRisks } from "./calculations/risk";
import { reconcileContract } from "./calculations/schedule";
import { toPayableView, toReceivableView } from "./calculations/status";
import { CASH_ACTIVITY_LIMIT, DEFAULT_HORIZON, FINANCE_LIST_LIMIT } from "./constants";
import { rowToAccount, rowToCashEvent, rowToPayable, rowToReceivable, rowToRecurringCost } from "./mappers";
import type {
  CashEvent, CashForecast, CashPosition, ContractReconciliation, FinanceAccount, FinanceOverview, FinanceRisk, PayableView, PayablesSummary, PortfolioTotals,
  ProjectProfitability, ReceivableView, ReceivablesSummary, RecurringCost,
} from "./types";

const base = () => getModule("finance").href;
export const financeHrefs = () => ({
  receivables: `${base()}/receivables`, payables: `${base()}/payables`, cashflow: `${base()}/cashflow`, costs: `${base()}/costs`, profitability: `${base()}/profitability`,
  project: (id: string) => `${base()}/projects/${id}`,
});

function logError(where: string, message: string | undefined) {
  if (message) console.error(`[finance] ${where} failed:`, message);
}

// ---------------------------------------------------------------------------
// Raw lists (one query each, cached per request)
// ---------------------------------------------------------------------------

export const listAccounts = cache(async (): Promise<FinanceAccount[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("finance_accounts").select("*").order("is_active", { ascending: false }).order("currency").order("name").returns<FinanceAccountRow[]>();
  logError("listAccounts", error?.message);
  return (data ?? []).map(rowToAccount);
});

/** Every cash event (ledger), newest first. Voided events are included and flagged. */
export const listCashEvents = cache(async (): Promise<CashEvent[]> => {
  const supabase = await createClient();
  const [{ data, error }, accounts] = await Promise.all([
    supabase.from("finance_cash_events").select("*").order("occurred_at", { ascending: false }).order("created_at", { ascending: false }).limit(FINANCE_LIST_LIMIT * 4).returns<FinanceCashEventRow[]>(),
    listAccounts(),
  ]);
  logError("listCashEvents", error?.message);
  const names = new Map(accounts.map((a) => [a.id, a.name]));
  return (data ?? []).map((r) => rowToCashEvent(r, r.account_id ? names.get(r.account_id) ?? null : null));
});

export const listRecurringCosts = cache(async (): Promise<RecurringCost[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("finance_recurring_costs").select("*").order("is_active", { ascending: false }).order("next_due_date").returns<FinanceRecurringCostRow[]>();
  logError("listRecurringCosts", error?.message);
  return (data ?? []).map(rowToRecurringCost);
});

export const listReceivableViews = cache(async (): Promise<ReceivableView[]> => {
  const supabase = await createClient();
  const [{ data, error }, events] = await Promise.all([
    supabase.from("finance_receivables").select("*").order("due_date").order("position").limit(FINANCE_LIST_LIMIT).returns<FinanceReceivableRow[]>(),
    listCashEvents(),
  ]);
  logError("listReceivableViews", error?.message);
  const today = isoToday();
  return (data ?? []).map((r) => toReceivableView(rowToReceivable(r), events.filter((e) => e.receivableId === r.id), today));
});

export const listPayableViews = cache(async (): Promise<PayableView[]> => {
  const supabase = await createClient();
  const [{ data, error }, events] = await Promise.all([
    supabase.from("finance_payables").select("*").order("due_date").limit(FINANCE_LIST_LIMIT).returns<FinancePayableRow[]>(),
    listCashEvents(),
  ]);
  logError("listPayableViews", error?.message);
  const today = isoToday();
  return (data ?? []).map((r) => toPayableView(rowToPayable(r), events.filter((e) => e.payableId === r.id), today));
});

export async function getReceivableView(id: string): Promise<ReceivableView | null> {
  return (await listReceivableViews()).find((r) => r.id === id) ?? null;
}

export async function getPayableView(id: string): Promise<PayableView | null> {
  return (await listPayableViews()).find((p) => p.id === id) ?? null;
}

/** Recent actual cash movements for the ledger view. */
export async function listRecentCashActivity(limit = CASH_ACTIVITY_LIMIT): Promise<CashEvent[]> {
  return (await listCashEvents()).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Profitability (numbers from Projects, never recomputed here)
// ---------------------------------------------------------------------------

export const listProjectProfitability = cache(async (): Promise<ProjectProfitability[]> => {
  const [rows, thresholds] = await Promise.all([listProjectFinancials(), getMarginThresholds()]);
  return rows.map((r) => ({ ...r, marginHealth: marginHealth(r.financials.forecast.grossMargin, thresholds) }));
});

export async function getPortfolioProfitability(view: ProfitabilityView = "forecast", items?: ProjectProfitability[]): Promise<PortfolioTotals[]> {
  return portfolioTotals(items ?? (await listProjectProfitability()).filter((p) => isInDelivery(p.status)), view, CURRENCIES);
}

// ---------------------------------------------------------------------------
// Derived: positions, forecasts, overview, risks (per currency)
// ---------------------------------------------------------------------------

export const listCashPositions = cache(async (): Promise<CashPosition[]> => {
  const [accounts, events, receivables, payables, recurring] = await Promise.all([listAccounts(), listCashEvents(), listReceivableViews(), listPayableViews(), listRecurringCosts()]);
  const today = isoToday();
  const currencies = currenciesInUse([accounts, receivables, payables, recurring], CURRENCIES);
  return currencies.map((c) => cashPosition(c, accounts, events, today));
});

export async function getCashForecast(horizonMonths: number = DEFAULT_HORIZON): Promise<CashForecast[]> {
  const [positions, receivables, payables, recurring] = await Promise.all([listCashPositions(), listReceivableViews(), listPayableViews(), listRecurringCosts()]);
  const today = isoToday();
  return positions.map((position) => buildForecast({ currency: position.currency, position, receivables, payables, recurring, today, horizonMonths }));
}

/** Contract-vs-schedule reconciliation for projects in delivery or with receivables. */
export const listProjectReconciliations = cache(async (): Promise<{ projectId: string; projectName: string; status: string; reconciliation: ContractReconciliation }[]> => {
  const [projects, receivables] = await Promise.all([listProjectProfitability(), listReceivableViews()]);
  const withReceivables = new Set(receivables.map((r) => r.projectId));
  return projects
    .filter((p) => isInDelivery(p.status) || (withReceivables.has(p.projectId) && p.status !== "cancelled" && p.status !== "archived"))
    .map((p) => ({
      projectId: p.projectId, projectName: p.name, status: p.status,
      reconciliation: reconcileContract({ currency: p.currency, baselineRevenue: p.financials.baseline.revenue, approvedChangeRevenue: p.financials.approvedChanges.revenue }, receivables.filter((r) => r.projectId === p.projectId)),
    }));
});

export async function getFinanceAlerts(): Promise<FinanceRisk[]> {
  const [positions, forecasts, receivables, payables, recurring, projects] = await Promise.all([listCashPositions(), getCashForecast(DEFAULT_HORIZON), listReceivableViews(), listPayableViews(), listRecurringCosts(), listProjectReconciliations()]);
  return financeRisks({ today: isoToday(), positions, forecasts, receivables, payables, recurring, projects, hrefs: financeHrefs() });
}

export async function getFinanceOverview(): Promise<FinanceOverview> {
  const [positions, receivables, payables, recurring, projects, risks] = await Promise.all([listCashPositions(), listReceivableViews(), listPayableViews(), listRecurringCosts(), listProjectProfitability(), getFinanceAlerts()]);
  const today = isoToday();
  return {
    currencies: positions.map((position) => currencyOverview({ currency: position.currency, position, receivables, payables, recurring, projects, today })),
    risks,
    hasAccounts: positions.some((p) => !p.unknown),
  };
}

export async function getReceivablesSummary(): Promise<ReceivablesSummary> {
  return receivablesSummary(await listReceivableViews(), CURRENCIES);
}

export async function getPayablesSummary(): Promise<PayablesSummary> {
  return payablesSummary(await listPayableViews(), CURRENCIES);
}

// ---------------------------------------------------------------------------
// Project finance page
// ---------------------------------------------------------------------------

export interface MemberPayableSuggestion {
  memberId: string;
  talentCandidateId: string | null;
  displayName: string;
  projectRole: string;
  payModel: string;
  currency: Currency | null;
  suggestion: PayableSuggestion;
  /** Σ non-cancelled payables already created for this person on this project. */
  alreadyPayable: number;
}

export interface ProjectFinance {
  detail: ProjectDetail;
  receivables: ReceivableView[];
  payables: PayableView[];
  reconciliation: ContractReconciliation;
  members: MemberPayableSuggestion[];
  settings: BusinessSettings;
  accounts: FinanceAccount[];
}

export async function getProjectFinance(projectId: string): Promise<ProjectFinance | null> {
  const [detail, receivables, payables, settings, accounts] = await Promise.all([getProjectDetail(projectId), listReceivableViews(), listPayableViews(), getBusinessSettings(), listAccounts()]);
  if (!detail) return null;
  const mine = receivables.filter((r) => r.projectId === projectId);
  const minePay = payables.filter((p) => p.projectId === projectId);
  const f = detail.financials;
  return {
    detail,
    receivables: mine,
    payables: minePay,
    reconciliation: reconcileContract({ currency: detail.project.currency, baselineRevenue: f.baseline.revenue, approvedChangeRevenue: f.approvedChanges.revenue }, mine),
    members: detail.members.filter((m) => m.status !== "removed").map((m) => ({
      memberId: m.id, talentCandidateId: m.talentCandidateId, displayName: m.displayName, projectRole: m.projectRole, payModel: m.payModel, currency: m.currency ?? detail.project.currency,
      suggestion: suggestPayableAmount(m, detail.tasks, f.current.revenue),
      alreadyPayable: minePay.filter((p) => p.state !== "cancelled" && (m.talentCandidateId ? p.talentCandidateId === m.talentCandidateId : p.payeeName === m.displayName)).reduce((s, p) => s + p.amount, 0),
    })),
    settings,
    accounts,
  };
}

/** Compact numbers for the project's Financials tab. */
export interface ProjectPaymentsSummary {
  projectId: string;
  reconciliation: ContractReconciliation;
  receivableCount: number;
  payableOutstanding: number;
}

export async function getProjectPaymentsSummary(projectId: string, financials: { currency: Currency; baselineRevenue: number; approvedChangeRevenue: number }): Promise<ProjectPaymentsSummary> {
  const [receivables, payables] = await Promise.all([listReceivableViews(), listPayableViews()]);
  const mine = receivables.filter((r) => r.projectId === projectId);
  return {
    projectId,
    reconciliation: reconcileContract(financials, mine),
    receivableCount: mine.filter((r) => r.state !== "cancelled").length,
    payableOutstanding: payables.filter((p) => p.projectId === projectId).reduce((s, p) => s + p.outstanding, 0),
  };
}

// ---------------------------------------------------------------------------
// Pickers
// ---------------------------------------------------------------------------

export interface FinancePickers {
  projects: { id: string; name: string; currency: Currency; clientId: string | null; clientName: string | null; status: string }[];
  clients: { id: string; name: string }[];
  people: { id: string; name: string; role: string | null }[];
  accounts: FinanceAccount[];
  settings: BusinessSettings;
}

export const getFinancePickers = cache(async (): Promise<FinancePickers> => {
  const supabase = await createClient();
  const [projects, clients, talent, accounts, settings] = await Promise.all([
    listProjectProfitability(),
    supabase.from("company_leads").select("id, name").order("name").limit(500).returns<{ id: string; name: string }[]>(),
    listActiveTalent(),
    listAccounts(),
    getBusinessSettings(),
  ]);
  return {
    projects: projects.filter((p) => p.status !== "cancelled" && p.status !== "archived").map((p) => ({ id: p.projectId, name: p.name, currency: p.currency, clientId: p.clientId, clientName: p.clientName, status: p.status })),
    clients: clients.data ?? [],
    people: talent.map((t) => ({ id: t.id, name: t.fullName, role: t.role })),
    accounts: accounts.filter((a) => a.isActive),
    settings,
  };
});

// ---------------------------------------------------------------------------
// Dated cash events for the Dashboard timeline
// ---------------------------------------------------------------------------

export interface FinanceDateEvent {
  kind: "receivable" | "payable";
  id: string;
  label: string;
  party: string | null;
  projectId: string | null;
  projectName: string | null;
  amount: number;
  currency: Currency;
  date: string;
  overdue: boolean;
}

/** Open receivables and payables due inside [from, to], with what is still outstanding. */
export async function listFinanceDateEvents(from: string, to: string): Promise<FinanceDateEvent[]> {
  const [receivables, payables] = await Promise.all([listReceivableViews(), listPayableViews()]);
  const inRange = (d: string) => d >= from && d <= to;
  const out: FinanceDateEvent[] = [];
  for (const r of receivables) {
    if (r.state === "cancelled" || r.outstanding <= 0) continue;
    const date = r.expectedDate ?? r.dueDate;
    if (inRange(date)) out.push({ kind: "receivable", id: r.id, label: r.label, party: r.clientName, projectId: r.projectId, projectName: r.projectName, amount: r.outstanding, currency: r.currency, date, overdue: r.status === "overdue" });
  }
  for (const p of payables) {
    if (p.state === "cancelled" || p.outstanding <= 0) continue;
    if (inRange(p.dueDate)) out.push({ kind: "payable", id: p.id, label: p.label, party: p.payeeName, projectId: p.projectId, projectName: p.projectName, amount: p.outstanding, currency: p.currency, date: p.dueDate, overdue: p.status === "overdue" });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
