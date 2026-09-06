"use client";

import { useI18n } from "@/lib/i18n/client";

import { addTalentTag, saveTalentToBench, updateTalentStatus } from "../../actions/talent";
import type { TalentCandidate } from "../../types";
import { ReviewList, type ReviewActions } from "../shared/review-list";
import { TalentCard } from "./talent-card";

const actions: ReviewActions = {
  approve: (ids) => updateTalentStatus(ids, "shortlisted"),
  reject: (ids) => updateTalentStatus(ids, "rejected"),
  save: (ids) => saveTalentToBench(ids),
  review: (ids) => updateTalentStatus(ids, "reviewed"),
  addTag: (ids, tag) => addTalentTag(ids, tag),
};

export function TalentList({ items }: { items: TalentCandidate[] }) {
  const { dict } = useI18n();
  return (
    <ReviewList
      items={items}
      actions={actions}
      saveLabel={dict.sourcing.review.saveToBench}
      exportName="grafiq-talent"
      renderCard={(c, state) => <TalentCard candidate={c} state={state} />}
      toCsvRow={(c) => ({
        name: c.fullName, role: c.role, seniority: c.seniority, country: c.country, city: c.city, remote: c.remote ? "yes" : "no",
        rate_min: c.hourlyRateMin, rate_max: c.hourlyRateMax, currency: c.rateCurrency, years: c.yearsExperience,
        skills: c.skills.join("; "), technologies: c.technologies.join("; "), portfolio: c.portfolioUrl, profile: c.profileUrl,
        score: c.manualScore ?? c.aiScore, status: c.status, in_bench: c.inTalentBench ? "yes" : "no", tags: c.tags.join("; "),
      })}
    />
  );
}
