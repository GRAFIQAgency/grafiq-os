import Link from "next/link";
import { Landmark } from "lucide-react";

import { DetailSection, Facts } from "@/components/shared/detail-section";
import { buttonVariants } from "@/components/ui/button";
import { getModule } from "@/config/modules";
import { formatDate, formatMoney } from "@/lib/format";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";
import type { ProjectFinancials } from "@/modules/projects/types";
import { cn } from "@/lib/utils";

import { getProjectPaymentsSummary } from "../queries";

/** Small "Payments" section for the project's Financials tab. Composed by the project route (Projects never imports Finance). */
export async function ProjectPaymentsPanel({ projectId, financials, dict, locale }: { projectId: string; financials: ProjectFinancials; dict: Dictionary; locale: Locale }) {
  const t = dict.finance.project;
  const s = await getProjectPaymentsSummary(projectId, { currency: financials.currency, baselineRevenue: financials.baseline.revenue, approvedChangeRevenue: financials.approvedChanges.revenue });
  const r = s.reconciliation;
  const money = (v: number) => formatMoney(v, financials.currency, locale);
  const href = `${getModule("finance").href}/projects/${projectId}`;
  return (
    <DetailSection title={t.title} action={<Link href={href} className={buttonVariants({ size: "sm", variant: "outline" })} data-guide="projects-finance"><Landmark data-icon="inline-start" />{s.receivableCount ? t.openInFinance : t.generate}</Link>}>
      <p className="mb-3 text-xs text-muted-foreground">{t.panelHint}</p>
      <Facts items={[
        { label: t.contractValue, value: <span className="font-semibold">{money(r.contractValue)}</span> },
        { label: t.scheduled, value: money(r.scheduledNet) },
        { label: t.received, value: money(r.receivedGross) },
        { label: t.outstanding, value: money(r.outstandingGross) },
        { label: t.nextPayment, value: r.nextDue ? `${money(r.nextDue.amount)} · ${formatDate(r.nextDue.dueDate, locale)}` : "—" },
        { label: t.overdue, value: <span className={cn(r.overdueCount && "font-semibold text-red-400")}>{r.overdueCount ? `${money(r.overdueAmount)} (${r.overdueCount})` : "—"}</span> },
      ]} />
      {r.contractValue > 0 && (r.unscheduled > 0 || r.overScheduled > 0) ? <p className="mt-3 text-xs text-amber-400">{r.unscheduled > 0 ? interpolate(t.unscheduled, { amount: money(r.unscheduled) }) : interpolate(t.overScheduled, { amount: money(r.overScheduled) })}</p> : null}
      {s.payableOutstanding > 0 ? <p className="mt-2 text-xs text-muted-foreground">{dict.finance.overview.unpaidPayables}: {money(s.payableOutstanding)}</p> : null}
    </DetailSection>
  );
}
