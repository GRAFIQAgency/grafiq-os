import { ATTENTION_GROUP_ORDER } from "../constants";
import type { ProjectQaSummary, QaAttentionGroup, QaAttentionItem, QaChecklistOverview, QaChecklistStatus, QaFilters, QaStats } from "../types";

/** Pure grouping / sorting / stats for the QA overview and the read API. */

export function attentionGroupOf(c: Pick<QaChecklistOverview, "status" | "overdue">): QaAttentionGroup {
  if (c.status === "approved") return "approved";
  if (c.status === "needs_fixes" || c.overdue) return "needs_attention";
  if (c.status === "ready_for_review") return "ready_for_review";
  if (c.status === "not_started") return "not_started";
  return "in_progress";
}

const STATUS_RANK: Record<QaChecklistStatus, number> = { needs_fixes: 0, ready_for_review: 1, in_progress: 2, not_started: 3, approved: 4 };

/**
 * Default order: failed / blocked and overdue first, then ready for review,
 * then approaching deadline, then in progress, then approved.
 */
export function sortOverview(list: readonly QaChecklistOverview[]): QaChecklistOverview[] {
  return [...list].sort((a, b) => {
    const ga = ATTENTION_GROUP_ORDER.indexOf(attentionGroupOf(a));
    const gb = ATTENTION_GROUP_ORDER.indexOf(attentionGroupOf(b));
    if (ga !== gb) return ga - gb;
    const fa = a.progress.failed + a.progress.blocked;
    const fb = b.progress.failed + b.progress.blocked;
    if (fa !== fb) return fb - fa;
    const da = a.dueDate ?? a.projectDeadline ?? "9999-12-31";
    const db = b.dueDate ?? b.projectDeadline ?? "9999-12-31";
    if (da !== db) return da.localeCompare(db);
    if (STATUS_RANK[a.status] !== STATUS_RANK[b.status]) return STATUS_RANK[a.status] - STATUS_RANK[b.status];
    return a.projectName.localeCompare(b.projectName);
  });
}

export function groupOverview(list: readonly QaChecklistOverview[]): { group: QaAttentionGroup; items: QaChecklistOverview[] }[] {
  const sorted = sortOverview(list);
  return ATTENTION_GROUP_ORDER.map((group) => ({ group, items: sorted.filter((c) => attentionGroupOf(c) === group) })).filter((g) => g.items.length);
}

const lc = (s: string | null | undefined) => (s ?? "").toLowerCase();

export function matchesFilters(c: QaChecklistOverview, f: QaFilters): boolean {
  if (f.q && !f.q.toLowerCase().split(/\s+/).every((w) => `${lc(c.projectName)} ${lc(c.clientName)} ${lc(c.title)} ${lc(c.templateName)}`.includes(w))) return false;
  if (f.status && c.status !== f.status) return false;
  if (f.projectId && c.projectId !== f.projectId) return false;
  if (f.projectType && c.projectType !== f.projectType) return false;
  if (f.reviewerId && c.reviewerId !== f.reviewerId) return false;
  if (f.failedOnly && c.progress.failed + c.progress.blocked === 0) return false;
  if (f.awaitingReview && c.status !== "ready_for_review") return false;
  if (f.approvedOnly && c.status !== "approved") return false;
  if (f.overdueOnly && !c.overdue) return false;
  return true;
}

/** Project-level summary from its checklists. */
export function summarizeProject(projectId: string, checklists: readonly Pick<QaChecklistOverview, "status" | "requiredForCompletion" | "overdue" | "progress">[]): ProjectQaSummary {
  const required = checklists.filter((c) => c.requiredForCompletion);
  const worst = [...checklists].map((c) => c.status).sort((a, b) => STATUS_RANK[a] - STATUS_RANK[b])[0] ?? null;
  return {
    projectId,
    checklists: checklists.length,
    requiredChecklists: required.length,
    approvedRequired: required.filter((c) => c.status === "approved").length,
    failed: checklists.reduce((s, c) => s + c.progress.failed, 0),
    blocked: checklists.reduce((s, c) => s + c.progress.blocked, 0),
    overdue: checklists.filter((c) => c.overdue).length,
    status: worst,
    blocksCompletion: required.some((c) => c.status !== "approved"),
  };
}

export function qaStats(list: readonly QaChecklistOverview[], today: string): QaStats {
  const month = today.slice(0, 7);
  return {
    projectsWithQa: new Set(list.map((c) => c.projectId)).size,
    needsFixes: list.filter((c) => c.status === "needs_fixes").length,
    readyForReview: list.filter((c) => c.status === "ready_for_review").length,
    inProgress: list.filter((c) => c.status === "in_progress" || c.status === "not_started").length,
    approvedThisMonth: list.filter((c) => c.status === "approved" && c.approvedAt?.startsWith(month)).length,
    overdue: list.filter((c) => c.overdue).length,
  };
}

/** Actionable items for a future Dashboard alert panel, most urgent first. */
export function attentionItems(list: readonly QaChecklistOverview[]): QaAttentionItem[] {
  const out: QaAttentionItem[] = [];
  for (const c of sortOverview(list)) {
    const base = { checklistId: c.id, projectId: c.projectId, projectName: c.projectName, title: c.title, dueDate: c.dueDate };
    if (c.progress.failed) out.push({ ...base, reason: "failed", count: c.progress.failed });
    if (c.progress.blocked) out.push({ ...base, reason: "blocked", count: c.progress.blocked });
    if (c.overdue) out.push({ ...base, reason: "overdue", count: 1 });
    if (c.status === "ready_for_review") out.push({ ...base, reason: "ready_for_review", count: 1 });
  }
  return out;
}
