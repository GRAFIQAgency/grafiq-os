import Link from "next/link";
import { ArrowLeft, ExternalLink, FolderKanban } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Chips } from "@/components/shared/chips";
import { DetailSection, Facts } from "@/components/shared/detail-section";
import { StatusBadge } from "@/components/shared/status-badge";
import { getModule } from "@/config/modules";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { formatDate, formatMoney } from "@/lib/format";
import { interpolate } from "@/lib/i18n/interpolate";
import { setCompanyTags } from "@/modules/sourcing/actions/companies";
import { ActivityList } from "@/modules/sourcing/components/shared/activity-list";
import { NotesPanel } from "@/modules/sourcing/components/shared/notes-panel";
import { TagsEditor } from "@/modules/sourcing/components/shared/tags-editor";
import { SignalChips } from "@/modules/sourcing/components/companies/signals-list";
import { ScoreBadge } from "@/modules/sourcing/components/shared/score-badge";
import { HIGH_LEAD_SCORE } from "@/modules/sourcing/constants";
import type { ActivityEntry, CompanyContact, CompanySignal, InternalNote } from "@/modules/sourcing/types";

import type { Deal, DealProject, SalesPickers } from "../types";
import { ContactsEditor } from "./contacts-editor";
import { DealForm } from "./deal-form";
import { StageBadge } from "./stage-badge";
import { StageControls } from "./stage-controls";

interface DealDetailProps {
  deal: Deal;
  contacts: CompanyContact[];
  signals: CompanySignal[];
  projects: DealProject[];
  notes: InternalNote[];
  activity: ActivityEntry[];
  pickers: SalesPickers;
  dict: Dictionary;
  locale: Locale;
}

export function DealDetail({ deal, contacts, signals, projects, notes, activity, pickers, dict, locale }: DealDetailProps) {
  const t = dict.sales;
  const c = deal.company;
  const d = deal.details;
  const tc = dict.sourcing.companies;
  const projectStatuses = dict.projects.statuses as Record<string, string>;
  const newProjectHref = `${getModule("projects").href}/new?client=${c.id}${d.pricingEstimateId ? `&estimate=${d.pricingEstimateId}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link href={getModule("sales").href} className={buttonVariants({ variant: "ghost", size: "xs" })}>
            <ArrowLeft data-icon="inline-start" />
            {dict.sourcing.common.back}
          </Link>
          <h2 className="text-xl font-semibold tracking-tight">{c.name}</h2>
          <p className="text-sm text-muted-foreground">
            {[c.industry, [c.city, c.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <StageBadge stage={deal.stage} dict={dict} />
            {deal.nextActionOverdue ? <StatusBadge status="rejected" label={t.detail.overdue} /> : null}
            <ScoreBadge score={c.leadScore} manual={c.manualScore} highFrom={HIGH_LEAD_SCORE} />
            {c.crmAddedAt ? <span className="text-xs text-muted-foreground">{interpolate(t.detail.inCrmSince, { date: formatDate(c.crmAddedAt, locale) })}</span> : null}
          </div>
          {deal.stage === "customer" && d.wonAt ? <p className="text-xs text-emerald-400">{interpolate(t.detail.wonOn, { date: formatDate(d.wonAt, locale) })}</p> : null}
          {deal.stage === "lost" ? <p className="text-xs text-red-400">{interpolate(t.detail.lostOn, { date: formatDate(d.lostAt, locale), reason: d.lostReason ?? "—" })}</p> : null}
        </div>
        <div className="flex flex-wrap items-start justify-end gap-2">
          <Link href={`${getModule("sourcing").href}/companies/${c.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {t.openInSourcing}
          </Link>
          <Link href={newProjectHref} className={buttonVariants({ variant: deal.stage === "customer" ? "default" : "outline", size: "sm" })} data-guide="sales-create-project">
            <FolderKanban data-icon="inline-start" />
            {t.detail.createProject}
          </Link>
          <StageControls id={c.id} stage={deal.stage} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <DealForm deal={deal} pickers={pickers} />

          <DetailSection title={t.detail.company}>
            {c.description ? <p className="mb-4 text-sm text-muted-foreground">{c.description}</p> : null}
            <Facts items={[
              { label: tc.website, value: c.website ? <a href={c.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">{c.domain ?? c.website} <ExternalLink className="size-3" /></a> : null },
              { label: tc.industry, value: c.industry },
              { label: tc.employees, value: c.employeeCount ?? c.sizeBucket },
              { label: tc.type, value: c.companyType ? tc.types[c.companyType] : null },
              { label: "IČO / Reg.", value: c.registrationId },
              { label: t.detail.sourcingStatus, value: tc.statuses[c.status] },
            ]} />
            <div className="mt-4 space-y-2">
              {signals.length ? <SignalChips signals={signals} dict={dict} /> : null}
              {c.technologies.length ? <Chips items={c.technologies} max={12} /> : null}
              <TagsEditor tags={c.tags} onSave={setCompanyTags.bind(null, c.id)} />
            </div>
          </DetailSection>

          <DetailSection title={t.detail.projects}>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">{deal.stage === "customer" ? t.detail.noProjectsCustomer : t.detail.noProjects}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {projects.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
                    <Link href={`${getModule("projects").href}/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{projectStatuses[p.status] ?? p.status}</span>
                      <span className="tabular-nums">{formatMoney(p.revenue, p.currency, locale)}</span>
                      <span>{formatDate(p.deadline, locale)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>
        </div>

        <div className="space-y-6">
          <DetailSection title={t.contacts.title}>
            <ContactsEditor companyId={c.id} contacts={contacts} />
          </DetailSection>
          <DetailSection title={dict.sourcing.talent.internalNotes}>
            <NotesPanel entityType="company" entityId={c.id} notes={notes} />
          </DetailSection>
          <DetailSection title={dict.sourcing.talent.activity}>
            <ActivityList entries={activity} dict={dict} locale={locale} />
          </DetailSection>
        </div>
      </div>
    </div>
  );
}
