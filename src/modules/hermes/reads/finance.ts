import "server-only";

import { CURRENCIES } from "@/config/currencies";
import { isoToday } from "@/modules/finance/calculations/dates";
import { cashPosition, isStale } from "@/modules/finance/calculations/forecast";
import { monthlyEquivalent } from "@/modules/finance/calculations/recurring";
import { toPayableView, toReceivableView } from "@/modules/finance/calculations/status";
import { FINANCE_LIST_LIMIT } from "@/modules/finance/constants";
import { rowToAccount, rowToCashEvent, rowToPayable, rowToReceivable, rowToRecurringCost } from "@/modules/finance/mappers";
import type { FinanceAccountRow, FinanceCashEventRow, FinancePayableRow, FinanceReceivableRow, FinanceRecurringCostRow } from "@/types/database";

import { hermesClient } from "../client";
import { money } from "./shared";

/**
 * Cash, not profit.
 *
 * Everything here is money that has moved or is expected to move, including
 * VAT where it applies. It never matches project margins, and it must not be
 * compared with them. Each currency is reported on its own.
 */
export async function financeOverview() {
  const supabase = hermesClient();
  const [accounts, receivables, payables, recurring, events] = await Promise.all([
    supabase.from("finance_accounts").select("*").order("currency").order("name").returns<FinanceAccountRow[]>(),
    supabase.from("finance_receivables").select("*").order("due_date").limit(FINANCE_LIST_LIMIT).returns<FinanceReceivableRow[]>(),
    supabase.from("finance_payables").select("*").order("due_date").limit(FINANCE_LIST_LIMIT).returns<FinancePayableRow[]>(),
    supabase.from("finance_recurring_costs").select("*").order("next_due_date").returns<FinanceRecurringCostRow[]>(),
    supabase.from("finance_cash_events").select("*").order("occurred_at", { ascending: false }).limit(FINANCE_LIST_LIMIT).returns<FinanceCashEventRow[]>(),
  ]);

  const day = isoToday();
  const accountList = (accounts.data ?? []).map(rowToAccount);
  const cashEvents = (events.data ?? []).map((r) => rowToCashEvent(r, null));
  const receivableViews = (receivables.data ?? []).map((r) => toReceivableView(rowToReceivable(r), cashEvents.filter((e) => e.receivableId === r.id), day));
  const payableViews = (payables.data ?? []).map((p) => toPayableView(rowToPayable(p), cashEvents.filter((e) => e.payableId === p.id), day));
  const recurringList = (recurring.data ?? []).map(rowToRecurringCost);

  const currencies = CURRENCIES.filter((c) =>
    accountList.some((a) => a.currency === c) || receivableViews.some((r) => r.currency === c) ||
    payableViews.some((p) => p.currency === c) || recurringList.some((r) => r.currency === c)
  );

  return {
    note: "Cash flow, including VAT where it applies. This is not project profitability — never compare the two or add currencies together.",
    asOf: day,
    hasAccounts: accountList.some((a) => a.isActive),
    currencies: currencies.map((currency) => {
      const position = cashPosition(currency, accountList, cashEvents, day);
      const openReceivables = receivableViews.filter((r) => r.currency === currency && r.state !== "cancelled" && r.outstanding > 0);
      const openPayables = payableViews.filter((p) => p.currency === currency && p.state !== "cancelled" && p.outstanding > 0);
      const overdueReceivables = openReceivables.filter((r) => r.status === "overdue");
      const overduePayables = openPayables.filter((p) => p.status === "overdue");
      const costs = recurringList.filter((r) => r.currency === currency && r.isActive);
      return {
        currency,
        cash: position.unknown
          ? { known: false, reason: "no active cash account in this currency" }
          : { known: true, available: money(position.available, currency), typedBalance: money(position.balance, currency), movementsSinceBalanceDate: money(position.adjustments, currency), staleBalance: position.stale },
        accounts: accountList.filter((a) => a.currency === currency && a.isActive).map((a) => ({
          id: a.id, name: a.name, type: a.type, balance: money(a.currentBalance, currency), balanceAsOf: a.balanceAsOf, stale: isStale(a.balanceAsOf, day),
        })),
        receivables: {
          outstanding: money(openReceivables.reduce((s, r) => s + r.outstanding, 0), currency),
          overdue: money(overdueReceivables.reduce((s, r) => s + r.outstanding, 0), currency),
          overdueItems: overdueReceivables.slice(0, 20).map((r) => ({
            id: r.id, label: r.label, client: r.clientName, project: r.projectName,
            outstanding: money(r.outstanding, currency), dueDate: r.dueDate, daysOverdue: r.daysOverdue, invoiceReference: r.invoiceReference,
          })),
        },
        payables: {
          outstanding: money(openPayables.reduce((s, p) => s + p.outstanding, 0), currency),
          overdue: money(overduePayables.reduce((s, p) => s + p.outstanding, 0), currency),
          overdueItems: overduePayables.slice(0, 20).map((p) => ({
            id: p.id, label: p.label, payee: p.payeeName, project: p.projectName,
            outstanding: money(p.outstanding, currency), dueDate: p.dueDate, daysOverdue: p.daysOverdue, category: p.category,
          })),
        },
        recurringCosts: {
          perMonth: money(costs.reduce((s, c) => s + monthlyEquivalent(c.amount, c.frequency), 0), currency),
          items: costs.map((c) => ({ id: c.id, name: c.name, category: c.category, amount: money(c.amount, currency), frequency: c.frequency, nextDueDate: c.nextDueDate })),
        },
      };
    }),
  };
}
