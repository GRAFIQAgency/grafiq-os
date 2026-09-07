import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Chips } from "@/components/shared/chips";
import { DetailSection, Facts } from "@/components/shared/detail-section";
import { StatusBadge } from "@/components/shared/status-badge";
import { getModule } from "@/config/modules";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { INTL_LOCALES } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";
import { setTalentTags } from "@/modules/sourcing/actions/talent";
import { ActivityList } from "@/modules/sourcing/components/shared/activity-list";
import { NotesPanel } from "@/modules/sourcing/components/shared/notes-panel";
import { SourceRecords } from "@/modules/sourcing/components/shared/source-records";
import { TagsEditor } from "@/modules/sourcing/components/shared/tags-editor";
import { RatingsEditor } from "@/modules/sourcing/components/talent/ratings-editor";
import { RATING_KEYS } from "@/modules/sourcing/constants";
import type { ActivityEntry, InternalNote, SourceRecordSummary } from "@/modules/sourcing/types";

import type { TalentPerson } from "../types";
import { BenchDetailsForm } from "./bench-details-form";
import { BenchStatusControls } from "./bench-status-controls";
import { RatingDots } from "./rating-dots";

interface TalentDetailProps {
  person: TalentPerson;
  notes: InternalNote[];
  activity: ActivityEntry[];
  sources: SourceRecordSummary[];
  dict: Dictionary;
  locale: Locale;
}

const BENCH_TONE = { active: "reviewed", preferred: "preferred", limited: "shortlisted", unavailable: "rejected", paused: "archived", archived: "archived" } as const;

export function TalentDetail({ person, notes, activity, sources, dict, locale }: TalentDetailProps) {
  const t = dict.talent;
  const c = person.candidate;
  const d = person.details;
  const archived = d.benchStatus === "archived" || !c.inTalentBench;
  const fmt = new Intl.DateTimeFormat(INTL_LOCALES[locale], { dateStyle: "medium" });
  const link = (url: string | null) =>
    url ? <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">{url.replace(/^https?:\/\//, "").slice(0, 40)} <ExternalLink className="size-3" /></a> : null;
  const sourceLabels = t.sources as Record<string, string>;
  const origins = [...new Set(sources.map((s) => s.sourceId))];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link href={getModule("talent").href} className={buttonVariants({ variant: "ghost", size: "xs" })}>
            <ArrowLeft data-icon="inline-start" />
            {dict.sourcing.common.back}
          </Link>
          <h2 className="text-xl font-semibold tracking-tight">{c.fullName}</h2>
          <p className="text-sm text-muted-foreground">
            {[c.role, c.seniority ? dict.sourcing.talent.seniorities[c.seniority] : null, [c.city, c.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={BENCH_TONE[d.benchStatus]} label={t.statuses[d.benchStatus]} />
            <StatusBadge status={c.availability === "available" ? "approved" : c.availability === "unavailable" ? "rejected" : "shortlisted"} label={t.availabilities[c.availability ?? "unknown"]} />
            {c.benchAddedAt ? <span className="text-xs text-muted-foreground">{interpolate(t.detail.onBenchSince, { date: fmt.format(new Date(c.benchAddedAt)) })}</span> : null}
          </div>
          {archived ? <p className="text-xs text-amber-400">{t.detail.archivedNote}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`${getModule("sourcing").href}/talent/${c.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {t.openInSourcing}
          </Link>
          <BenchStatusControls id={c.id} archived={archived} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <DetailSection title={t.detail.overview}>
            <Facts items={[
              { label: dict.sourcing.talent.role, value: c.role },
              { label: dict.sourcing.talent.seniority, value: c.seniority ? dict.sourcing.talent.seniorities[c.seniority] : null },
              { label: dict.sourcing.talent.languages, value: c.languages.join(", ") || null },
              { label: dict.sourcing.talent.yearsLabel, value: c.yearsExperience != null ? interpolate(dict.sourcing.talent.years, { n: c.yearsExperience }) : null },
              { label: dict.sourcing.talent.email, value: c.email },
              { label: dict.sourcing.talent.profile, value: link(c.profileUrl) },
              { label: dict.sourcing.talent.portfolio, value: link(c.portfolioUrl) },
              { label: t.detail.pipelineStatus, value: dict.sourcing.talent.statuses[c.status] },
            ]} />
            <div className="mt-4 space-y-2">
              <Chips items={[...c.skills, ...c.technologies.filter((x) => !c.skills.includes(x))]} max={40} />
              <TagsEditor tags={c.tags} onSave={setTalentTags.bind(null, c.id)} />
            </div>
            {c.summary ? <p className="mt-4 text-sm text-muted-foreground">{c.summary}</p> : null}
          </DetailSection>

          <BenchDetailsForm person={person} />

          <DetailSection title={t.detail.history}>
            <p className="mb-3 text-sm">
              <span className="text-muted-foreground">{t.detail.enteredVia}: </span>
              {origins.length ? origins.map((o) => sourceLabels[o] ?? o).join(", ") : t.detail.unknown}
            </p>
            <SourceRecords records={sources} dict={dict} locale={locale} />
          </DetailSection>
        </div>

        <div className="space-y-6">
          <DetailSection title={t.detail.quality}>
            <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm" data-guide="talent-quality">
              {RATING_KEYS.map((key) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{dict.sourcing.talent.ratingKeys[key]}</span>
                  <RatingDots value={c.ratings[key]} label={dict.sourcing.talent.ratingKeys[key]} />
                </div>
              ))}
            </div>
            <p className="mb-3 text-xs text-muted-foreground">{t.detail.ratingsHint}</p>
            <RatingsEditor candidateId={c.id} ratings={c.ratings} />
          </DetailSection>
          <DetailSection title={t.detail.notes}>
            <NotesPanel entityType="talent" entityId={c.id} notes={notes} />
          </DetailSection>
          <DetailSection title={t.detail.activity}>
            <ActivityList entries={activity} dict={dict} locale={locale} />
          </DetailSection>
        </div>
      </div>
    </div>
  );
}
