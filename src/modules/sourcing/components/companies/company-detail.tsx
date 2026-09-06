import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { getModule } from "@/config/modules";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { INTL_LOCALES } from "@/lib/i18n/config";

import { rescoreCompany, setCompanyManualScore, setCompanyTags } from "../../actions/companies";
import { HIGH_LEAD_SCORE } from "../../constants";
import type { ActivityEntry, AiEvaluation, CompanyContact, CompanyLead, CompanySignal, InternalNote, SourceRecordSummary } from "../../types";
import { ActivityList } from "../shared/activity-list";
import { Chips } from "../shared/chips";
import { DetailSection, Facts } from "../shared/detail-section";
import { Freshness } from "../shared/freshness";
import { NotesPanel } from "../shared/notes-panel";
import { ScorePanel } from "../shared/score-panel";
import { SourceRecords } from "../shared/source-records";
import { StatusBadge } from "../shared/status-badge";
import { TagsEditor } from "../shared/tags-editor";
import { CompanyStatusControls } from "./company-status-controls";
import { SignalsTable } from "./signals-list";

interface CompanyDetailProps {
  lead: CompanyLead;
  signals: CompanySignal[];
  contacts: CompanyContact[];
  evaluations: AiEvaluation[];
  notes: InternalNote[];
  activity: ActivityEntry[];
  sources: SourceRecordSummary[];
  aiEnabled: boolean;
  dict: Dictionary;
  locale: Locale;
}

export function CompanyDetail({ lead, signals, contacts, evaluations, notes, activity, sources, aiEnabled, dict, locale }: CompanyDetailProps) {
  const t = dict.sourcing.companies;
  const c = lead;
  const fmt = new Intl.DateTimeFormat(INTL_LOCALES[locale], { dateStyle: "medium" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link href={`${getModule("sourcing").href}/companies`} className={buttonVariants({ variant: "ghost", size: "xs" })}>
            <ArrowLeft data-icon="inline-start" />
            {dict.sourcing.common.back}
          </Link>
          <h2 className="text-xl font-semibold tracking-tight">{c.name}</h2>
          <p className="text-sm text-muted-foreground">
            {[c.industry, [c.city, c.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={c.status} label={t.statuses[c.status]} />
            {c.crmStatus ? <StatusBadge status="qualified" label={`${dict.sourcing.review.inCrm} · ${t.crmStatuses[c.crmStatus]}`} /> : null}
            <Freshness lastCheckedAt={c.lastCheckedAt} firstDiscoveredAt={c.firstDiscoveredAt} dict={dict} locale={locale} />
          </div>
        </div>
        <CompanyStatusControls lead={c} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <DetailSection title={t.overview}>
            {c.description ? <p className="mb-4 text-sm text-muted-foreground">{c.description}</p> : null}
            <Facts items={[
              { label: t.website, value: c.website ? <a href={c.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">{c.domain ?? c.website} <ExternalLink className="size-3" /></a> : null },
              { label: t.industry, value: c.industry },
              { label: t.type, value: c.companyType ? t.types[c.companyType] : null },
              { label: t.model, value: c.businessModel ? t.models[c.businessModel] : null },
              { label: t.language, value: c.language },
            ]} />
          </DetailSection>

          <DetailSection title={t.information}>
            <Facts items={[
              { label: t.employees, value: c.employeeCount ?? c.sizeBucket },
              { label: t.founded, value: c.foundedYear },
              { label: "IČO / Reg.", value: c.registrationId },
              { label: dict.pricing.summary.revenue, value: c.revenue != null ? `${c.revenue} ${c.revenueCurrency ?? ""}` : null },
            ]} />
            {c.technologies.length ? (
              <div className="mt-4">
                <p className="mb-1 text-xs text-muted-foreground">{t.technologies}</p>
                <Chips items={c.technologies} max={20} />
              </div>
            ) : null}
            {c.keywords.length ? (
              <div className="mt-3">
                <p className="mb-1 text-xs text-muted-foreground">{t.keywords}</p>
                <Chips items={c.keywords} max={20} />
              </div>
            ) : null}
          </DetailSection>

          <DetailSection title={t.signals}>
            <SignalsTable signals={signals} dict={dict} formatDate={(iso) => fmt.format(new Date(iso))} />
          </DetailSection>

          <DetailSection title={t.websiteAnalysis}>
            <p className="text-sm text-muted-foreground">{t.websiteAnalysisHint}</p>
          </DetailSection>

          <DetailSection title={t.aiAnalysis}>
            <ScorePanel
              evaluation={evaluations[0] ?? null}
              score={c.leadScore}
              manualScore={c.manualScore}
              highFrom={HIGH_LEAD_SCORE}
              aiEnabled={aiEnabled}
              onOverride={setCompanyManualScore.bind(null, c.id)}
              onRescore={rescoreCompany.bind(null, c.id)}
            />
          </DetailSection>

          <DetailSection title={dict.sourcing.talent.sourceData}>
            <SourceRecords records={sources} dict={dict} locale={locale} />
          </DetailSection>
        </div>

        <div className="space-y-6">
          <DetailSection title={t.people}>
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noContacts}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {contacts.map((k) => (
                  <li key={k.id} className="rounded-md border px-3 py-2">
                    <p className="font-medium">{k.name}</p>
                    <p className="text-xs text-muted-foreground">{[k.jobTitle, k.email, k.phone].filter(Boolean).join(" · ")}</p>
                    {k.profileUrl ? <a href={k.profileUrl} target="_blank" rel="noreferrer" className="text-xs underline-offset-2 hover:underline">{k.profileUrl}</a> : null}
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>
          <DetailSection title={dict.sourcing.talent.tags}>
            <TagsEditor tags={c.tags} onSave={setCompanyTags.bind(null, c.id)} />
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
