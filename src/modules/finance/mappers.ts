import type { FinanceAccountRow, FinanceCashEventRow, FinancePayableRow, FinanceReceivableRow, FinanceRecurringCostRow } from "@/types/database";

import type { CashEvent, FinanceAccount, Payable, Receivable, RecurringCost } from "./types";

const num = (v: number | string | null) => (v == null ? null : Number(v));

export function rowToAccount(r: FinanceAccountRow): FinanceAccount {
  return { id: r.id, createdAt: r.created_at, updatedAt: r.updated_at, name: r.name, currency: r.currency, type: r.type, currentBalance: Number(r.current_balance), balanceAsOf: r.balance_as_of, isActive: r.is_active, notes: r.notes };
}

export function rowToReceivable(r: FinanceReceivableRow): Receivable {
  return {
    id: r.id, createdAt: r.created_at, updatedAt: r.updated_at, projectId: r.project_id, projectName: r.project_name, clientId: r.client_id, clientName: r.client_name, label: r.label,
    netAmount: Number(r.net_amount), vatRate: Number(r.vat_rate), amount: Number(r.amount), currency: r.currency, dueDate: r.due_date, expectedDate: r.expected_date,
    percentOfContract: num(r.percent_of_contract), invoiceReference: r.invoice_reference, invoiceSentAt: r.invoice_sent_at, notes: r.notes, state: r.status, cancelledAt: r.cancelled_at, position: r.position,
  };
}

export function rowToPayable(r: FinancePayableRow): Payable {
  return {
    id: r.id, createdAt: r.created_at, updatedAt: r.updated_at, label: r.label, amount: Number(r.amount), currency: r.currency, dueDate: r.due_date, projectId: r.project_id, projectName: r.project_name,
    talentCandidateId: r.talent_candidate_id, supplierId: r.supplier_id, payeeName: r.payee_name, category: r.category, notes: r.notes, state: r.status, cancelledAt: r.cancelled_at,
  };
}

export function rowToRecurringCost(r: FinanceRecurringCostRow): RecurringCost {
  return { id: r.id, createdAt: r.created_at, updatedAt: r.updated_at, name: r.name, category: r.category, amount: Number(r.amount), currency: r.currency, frequency: r.frequency, nextDueDate: r.next_due_date, isActive: r.is_active, notes: r.notes };
}

export function rowToCashEvent(r: FinanceCashEventRow, accountName: string | null): CashEvent {
  return {
    id: r.id, createdAt: r.created_at, direction: r.direction, amount: Number(r.amount), currency: r.currency, occurredAt: r.occurred_at, accountId: r.account_id, accountName,
    receivableId: r.receivable_id, payableId: r.payable_id, recurringCostId: r.recurring_cost_id, label: r.label, note: r.note, voidedAt: r.voided_at, voidReason: r.void_reason,
    kind: r.receivable_id ? "receivable" : r.payable_id ? "payable" : r.recurring_cost_id ? "recurring" : "other",
  };
}
