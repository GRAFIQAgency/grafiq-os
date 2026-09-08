/** Merges the dated events the modules already own into one short timeline. */
import type { FinanceDateEvent } from "@/modules/finance/queries";
import type { ProjectDateEvent } from "@/modules/projects/queries";
import type { QaDateEvent } from "@/modules/qa/queries";
import type { SalesDateEvent } from "@/modules/sales/queries";

import { SOURCE_ORDER, TIMELINE_LIMIT } from "../constants";
import type { TimelineEvent } from "../types";

export interface TimelineHrefs {
  project: (id: string) => string;
  checklist: (id: string) => string;
  deal: (id: string) => string;
  receivables: string;
  payables: string;
}

export function toTimeline(
  input: {
    projects: readonly ProjectDateEvent[];
    qa: readonly QaDateEvent[];
    sales: readonly SalesDateEvent[];
    finance: readonly FinanceDateEvent[];
  },
  today: string,
  hrefs: TimelineHrefs
): TimelineEvent[] {
  const out: TimelineEvent[] = [];
  for (const p of input.projects) {
    out.push({
      id: `${p.kind}:${p.id}`, kind: p.kind, source: "projects",
      title: p.kind === "project_deadline" ? p.projectName : p.title,
      subject: p.kind === "milestone" ? p.projectName : null,
      date: p.date, href: hrefs.project(p.projectId), overdue: p.date < today, value: null,
    });
  }
  for (const q of input.qa) {
    out.push({ id: `qa:${q.checklistId}`, kind: "qa_due", source: "qa", title: q.title, subject: q.projectName, date: q.date, href: hrefs.checklist(q.checklistId), overdue: q.overdue, value: null });
  }
  for (const s of input.sales) {
    out.push({ id: `sales:${s.companyId}`, kind: "sales_action", source: "sales", title: s.title ?? s.name, subject: s.name, date: s.date, href: hrefs.deal(s.companyId), overdue: s.overdue, value: null });
  }
  for (const f of input.finance) {
    out.push({
      id: `${f.kind}:${f.id}`, kind: f.kind, source: "finance", title: f.label,
      subject: f.party ?? f.projectName, date: f.date,
      href: f.kind === "receivable" ? hrefs.receivables : hrefs.payables,
      overdue: f.overdue, value: { amount: f.amount, currency: f.currency },
    });
  }
  return sortTimeline(out);
}

export function sortTimeline(events: readonly TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => a.date.localeCompare(b.date) || SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source) || a.title.localeCompare(b.title));
}

/** Split into "today or already due" and "the next days", each capped. */
export function splitTimeline(events: readonly TimelineEvent[], today: string, limit = TIMELINE_LIMIT): { today: TimelineEvent[]; week: TimelineEvent[] } {
  const sorted = sortTimeline(events);
  return {
    today: sorted.filter((e) => e.date <= today).slice(0, limit),
    week: sorted.filter((e) => e.date > today).slice(0, limit),
  };
}
