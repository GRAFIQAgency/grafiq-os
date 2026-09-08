"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { DetailSection, Facts } from "@/components/shared/detail-section";
import { Button, buttonVariants } from "@/components/ui/button";
import { getModule } from "@/config/modules";
import { formatDate, formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

import type { FinancePickers, ProjectFinance as Data } from "../queries";
import type { PayablePrefill } from "./payable-form";
import { PayablesList } from "./payables-list";
import { ReceivablesList } from "./receivables-list";
import { ScheduleGenerator } from "./schedule-generator";

/** /finance/projects/[id]: contract reconciliation, payment schedule, client payments, outgoing payments, team → payables. */
export function ProjectFinanceView({ data, pickers, today }: { data: Data; pickers: FinancePickers; today: string }) {
  const { dict, locale } = useI18n();
  const t = dict.finance.project;
  const p = data.detail.project;
  const r = data.reconciliation;
  const cur = p.currency;
  const money = (v: number) => formatMoney(v, cur, locale);
  const [prefill, setPrefill] = useState<PayablePrefill | null>(null);
  const projectHref = `${getModule("projects").href}/${p.id}`;
  const suggestionText = (m: Data["members"][number]) => {
    const s = m.suggestion;
    const rate = s.rate == null ? "—" : s.basis === "percent" ? String(s.rate) : money(s.rate);
    return interpolate(t.suggestion[s.basis], { hours: s.hours ?? 0, rate, units: s.units ?? 0 });
  };

  return (
    <div className="space-y-6" data-guide="finance-project">
      <div className="space-y-2">
        <Link href={`${projectHref}?tab=financials`} className={buttonVariants({ variant: "ghost", size: "xs" })}><ArrowLeft data-icon="inline-start" />{t.backToProject}</Link>
        <h2 className="text-xl font-semibold tracking-tight">{p.name} · {t.title}</h2>
        <p className="text-sm text-muted-foreground">{[p.clientName, dict.projects.statuses[p.status], cur].filter(Boolean).join(" · ")} — {t.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DetailSection title={t.contractValue}>
          <Facts columns={1} items={[
            { label: t.baseline, value: money(r.baselineRevenue) },
            { label: t.changes, value: `+${money(r.approvedChangeRevenue)}` },
            { label: t.contractValue, value: <span className="font-semibold">{money(r.contractValue)}</span> },
          ]} />
        </DetailSection>
        <DetailSection title={t.scheduled} className="lg:col-span-2">
          <Facts items={[
            { label: `${t.scheduled} (${t.scheduledNet})`, value: money(r.scheduledNet) },
            { label: t.received, value: <span className="text-emerald-400">{money(r.receivedGross)}</span> },
            { label: t.outstanding, value: money(r.outstandingGross) },
            { label: t.nextPayment, value: r.nextDue ? `${money(r.nextDue.amount)} · ${formatDate(r.nextDue.dueDate, locale)}` : "—" },
            { label: t.overdue, value: <span className={cn(r.overdueCount && "font-semibold text-red-400")}>{r.overdueCount ? `${money(r.overdueAmount)} (${r.overdueCount})` : "—"}</span> },
          ]} />
          <p className={cn("mt-3 text-xs", r.unscheduled > 0 || r.overScheduled > 0 ? "text-amber-400" : "text-emerald-400")} data-guide="finance-reconciliation">
            {r.contractValue === 0 ? t.noContract : r.unscheduled > 0 ? interpolate(t.unscheduled, { amount: money(r.unscheduled) }) : r.overScheduled > 0 ? interpolate(t.overScheduled, { amount: money(r.overScheduled) }) : t.reconciled}
          </p>
        </DetailSection>
      </div>

      <DetailSection title={t.receivablesTitle}>
        <div className="space-y-4">
          {r.contractValue > 0 ? <ScheduleGenerator projectId={p.id} contractValue={r.contractValue} currency={cur} terms={data.settings.paymentTerms} vatRate={data.settings.vatRate} vatDefault={true} startDate={today} endDate={p.deadline && p.deadline > today ? p.deadline : null} compact /> : null}
          <ReceivablesList items={data.receivables} pickers={pickers} today={today} projectId={p.id} showProject={false} />
        </div>
      </DetailSection>

      <DetailSection title={t.team}>
        <p className="mb-3 text-xs text-muted-foreground">{t.teamHint}</p>
        {data.members.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : (
          <ul className="divide-y divide-border/60" data-guide="finance-team">
            {data.members.map((m) => (
              <li key={m.memberId} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{m.displayName} <span className="text-xs font-normal text-muted-foreground">· {m.projectRole} · {dict.projects.team.payModels[m.payModel as keyof typeof dict.projects.team.payModels] ?? m.payModel}</span></p>
                  <p className="text-xs text-muted-foreground">{suggestionText(m)}{m.alreadyPayable ? <span className="ml-2">· {interpolate(t.alreadyPayable, { amount: formatMoney(m.alreadyPayable, m.currency, locale) })}</span> : null}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums">{formatMoney(m.suggestion.amount, m.currency, locale)}</span>
                  <Button size="xs" variant="outline" data-guide="finance-create-payable" onClick={() => { setPrefill({ label: `${m.displayName} · ${p.name}`, amount: m.suggestion.amount, currency: (m.currency ?? cur) as PayablePrefill["currency"], projectId: p.id, talentCandidateId: m.talentCandidateId, payeeName: m.displayName, category: "freelancer" }); document.getElementById("project-payables")?.scrollIntoView({ block: "start", behavior: "smooth" }); }}>{t.createPayable}</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      <div id="project-payables">
        <DetailSection title={t.payablesTitle}>
          <PayablesList items={data.payables} pickers={pickers} today={today} prefill={prefill} onPrefillConsumed={() => setPrefill(null)} showProject={false} />
        </DetailSection>
      </div>
    </div>
  );
}
