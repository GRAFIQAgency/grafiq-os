import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { getModule } from "@/config/modules";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";

import { rescoreTalent, setTalentManualScore, setTalentTags } from "../../actions/talent";
import { HIGH_TALENT_SCORE } from "../../constants";
import type { ActivityEntry, AiEvaluation, InternalNote, RoleProfile, SourceRecordSummary, TalentCandidate } from "../../types";
import { ActivityList } from "../shared/activity-list";
import { Chips } from "../shared/chips";
import { DetailSection, Facts } from "../shared/detail-section";
import { Freshness } from "../shared/freshness";
import { NotesPanel } from "../shared/notes-panel";
import { ScorePanel } from "../shared/score-panel";
import { SourceRecords } from "../shared/source-records";
import { StatusBadge } from "../shared/status-badge";
import { TagsEditor } from "../shared/tags-editor";
import { RatingsEditor } from "./ratings-editor";
import { TalentStatusControls } from "./talent-status-controls";

interface TalentDetailProps {
  candidate: TalentCandidate;
  evaluations: AiEvaluation[];
  notes: InternalNote[];
  activity: ActivityEntry[];
  sources: SourceRecordSummary[];
  roleProfiles: RoleProfile[];
  aiEnabled: boolean;
  dict: Dictionary;
  locale: Locale;
}

export function TalentDetail({ candidate, evaluations, notes, activity, sources, roleProfiles, aiEnabled, dict, locale }: TalentDetailProps) {
  const t = dict.sourcing.talent;
  const c = candidate;
  const link = (url: string | null) =>
    url ? (
      <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
        {url.replace(/^https?:\/\//, "").slice(0, 40)} <ExternalLink className="size-3" />
      </a>
    ) : "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link href={`${getModule("sourcing").href}/talent`} className={buttonVariants({ variant: "ghost", size: "xs" })}>
            <ArrowLeft data-icon="inline-start" />
            {dict.sourcing.common.back}
          </Link>
          <h2 className="text-xl font-semibold tracking-tight">{c.fullName}</h2>
          <p className="text-sm text-muted-foreground">
            {[c.headline ?? c.role, [c.city, c.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={c.status} label={t.statuses[c.status]} />
            {c.inTalentBench ? <StatusBadge status="approved" label={dict.sourcing.review.inBench} /> : null}
            <Freshness lastCheckedAt={c.lastCheckedAt} firstDiscoveredAt={c.firstDiscoveredAt} dict={dict} locale={locale} />
          </div>
        </div>
        <TalentStatusControls candidate={c} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <DetailSection title={t.overview}>
            <Facts items={[
              { label: t.role, value: c.role },
              { label: t.seniority, value: c.seniority ? t.seniorities[c.seniority] : null },
              { label: t.employment, value: c.employmentType ? t.employments[c.employmentType] : null },
              { label: t.availability, value: c.availability ? t.availabilities[c.availability] : null },
              { label: t.rate, value: c.hourlyRateMin != null || c.hourlyRateMax != null ? `${c.hourlyRateMin ?? "?"}–${c.hourlyRateMax ?? "?"} ${c.rateCurrency ?? ""}/h` : null },
              { label: t.remote, value: c.remote == null ? null : c.remote ? dict.sourcing.search.yes : dict.sourcing.search.no },
              { label: t.languages, value: c.languages.join(", ") || null },
              { label: t.email, value: c.email },
              { label: t.profile, value: link(c.profileUrl) },
              { label: t.portfolio, value: link(c.portfolioUrl) },
            ]} />
            {c.summary ? <p className="mt-4 text-sm text-muted-foreground">{c.summary}</p> : null}
          </DetailSection>

          <DetailSection title={t.skills}>
            <div className="space-y-3">
              <Chips items={c.skills} max={40} />
              {c.technologies.length ? (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">{t.technologies}</p>
                  <Chips items={c.technologies} max={40} />
                </div>
              ) : null}
            </div>
          </DetailSection>

          <DetailSection title={t.experience}>
            <Facts items={[
              { label: t.yearsLabel, value: c.yearsExperience != null ? interpolate(t.years, { n: c.yearsExperience }) : null },
              { label: t.agency, value: c.agencyExperience == null ? null : c.agencyExperience ? dict.sourcing.search.yes : dict.sourcing.search.no },
            ]} />
          </DetailSection>

          <DetailSection title={t.aiEvaluation}>
            <ScorePanel
              evaluation={evaluations[0] ?? null}
              score={c.aiScore}
              manualScore={c.manualScore}
              highFrom={HIGH_TALENT_SCORE}
              aiEnabled={aiEnabled}
              roleProfiles={roleProfiles}
              onOverride={setTalentManualScore.bind(null, c.id)}
              onRescore={rescoreTalent.bind(null, c.id)}
            />
          </DetailSection>

          <DetailSection title={t.sourceData}>
            <SourceRecords records={sources} dict={dict} locale={locale} />
          </DetailSection>
        </div>

        <div className="space-y-6">
          <DetailSection title={t.tags}>
            <TagsEditor tags={c.tags} onSave={setTalentTags.bind(null, c.id)} />
          </DetailSection>
          <DetailSection title={t.ratings}>
            <RatingsEditor candidateId={c.id} ratings={c.ratings} />
          </DetailSection>
          <DetailSection title={t.internalNotes}>
            <NotesPanel entityType="talent" entityId={c.id} notes={notes} />
          </DetailSection>
          <DetailSection title={t.activity}>
            <ActivityList entries={activity} dict={dict} locale={locale} />
          </DetailSection>
        </div>
      </div>
    </div>
  );
}
