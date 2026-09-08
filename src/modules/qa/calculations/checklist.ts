import { RESOLVED_ITEM_STATUSES } from "../constants";
import type { ApprovalCheck, QaChecklistStatus, QaItemState, QaItemStatus, QaProgress } from "../types";

/**
 * Pure checklist rules — no React, no Supabase. Tested in checklist.test.ts.
 *
 * Item states:   pending · pass · fail · na · blocked
 * Checklist:     not_started → in_progress → needs_fixes / ready_for_review → approved
 *
 * Status is DERIVED from the items, except "approved", which is an explicit
 * human decision and only survives while the items still satisfy the rules.
 */

export function isResolved(status: QaItemStatus): boolean {
  return RESOLVED_ITEM_STATUSES.includes(status);
}

/** An item counts as correctly resolved for approval purposes. */
export function isSatisfied(item: QaItemState): boolean {
  if (item.status === "pass") return true;
  if (item.status === "na") return item.allowNa;
  return false;
}

/** N/A is only valid when the frozen item allows it. */
export function isValidStatusFor(item: Pick<QaItemState, "allowNa">, status: QaItemStatus): boolean {
  return status !== "na" || item.allowNa;
}

export function progressOf(items: readonly QaItemState[]): QaProgress {
  const count = (s: QaItemStatus) => items.filter((i) => i.status === s).length;
  const required = items.filter((i) => i.isRequired);
  const resolved = items.filter((i) => isResolved(i.status)).length;
  return {
    total: items.length,
    resolved,
    passed: count("pass"),
    failed: count("fail"),
    blocked: count("blocked"),
    na: count("na"),
    pending: count("pending"),
    requiredTotal: required.length,
    requiredResolved: required.filter((i) => isResolved(i.status)).length,
    percent: items.length ? Math.round((resolved / items.length) * 100) : 0,
  };
}

/**
 * Approval gate:
 *   every REQUIRED item is pass (or N/A where that item allows N/A)
 *   AND no item anywhere is fail or blocked.
 * Optional pending items do not block (they are simply not part of the gate).
 */
export function approvalCheck(items: readonly QaItemState[]): ApprovalCheck {
  const reasons: ApprovalCheck["reasons"] = [];
  if (items.some((i) => i.status === "fail")) reasons.push("has_failed");
  if (items.some((i) => i.status === "blocked")) reasons.push("has_blocked");
  if (items.some((i) => i.status === "na" && !i.allowNa)) reasons.push("invalid_na");
  const required = items.filter((i) => i.isRequired);
  if (required.some((i) => i.status === "pending")) reasons.push("required_pending");
  if (required.some((i) => i.status === "fail" || i.status === "blocked")) reasons.push("required_failed");
  return { eligible: reasons.length === 0 && items.length > 0, reasons: [...new Set(reasons)] };
}

/**
 * Derived status from the items alone (never "approved"):
 *   not_started       nothing resolved yet
 *   needs_fixes       any fail or blocked
 *   ready_for_review  approval gate satisfied
 *   in_progress       otherwise
 */
export function deriveStatus(items: readonly QaItemState[]): Exclude<QaChecklistStatus, "approved"> {
  if (!items.length || items.every((i) => i.status === "pending")) return "not_started";
  if (items.some((i) => i.status === "fail" || i.status === "blocked")) return "needs_fixes";
  if (approvalCheck(items).eligible) return "ready_for_review";
  return "in_progress";
}

/**
 * Next checklist state after an item change (or for consistency checks):
 * an approved checklist stays approved only while approval is still valid;
 * otherwise approval is cleared and the derived status applies.
 */
export function nextChecklistState(items: readonly QaItemState[], current: { status: QaChecklistStatus; approvedAt: string | null; approvedBy: string | null }): { status: QaChecklistStatus; approvedAt: string | null; approvedBy: string | null; approvalRevoked: boolean } {
  const wasApproved = current.status === "approved" || current.approvedAt != null;
  if (wasApproved && approvalCheck(items).eligible) return { status: "approved", approvedAt: current.approvedAt, approvedBy: current.approvedBy, approvalRevoked: false };
  return { status: deriveStatus(items), approvedAt: null, approvedBy: null, approvalRevoked: wasApproved };
}

/** Explicit approval by a human; returns null when the gate is not satisfied. */
export function approve(items: readonly QaItemState[], by: string, at: string): { status: "approved"; approvedAt: string; approvedBy: string } | null {
  return approvalCheck(items).eligible ? { status: "approved", approvedAt: at, approvedBy: by } : null;
}

/** Overdue = not approved and the due date is in the past (date-only compare). */
export function isOverdue(status: QaChecklistStatus, dueDate: string | null, today: string): boolean {
  return status !== "approved" && dueDate != null && dueDate < today;
}

/** First item that still needs attention: pending first, then failed/blocked. */
export function nextUnresolved<T extends QaItemState>(items: readonly T[]): T | null {
  return items.find((i) => i.status === "pending") ?? items.find((i) => i.status === "fail" || i.status === "blocked") ?? null;
}

/** Items grouped by category, in checklist order. */
export function groupByCategory<T extends { category: string }>(items: readonly T[]): { category: string; items: T[] }[] {
  const out: { category: string; items: T[] }[] = [];
  for (const item of items) {
    const g = out.find((x) => x.category === item.category);
    if (g) g.items.push(item);
    else out.push({ category: item.category, items: [item] });
  }
  return out;
}
