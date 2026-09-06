"use client";

import { useI18n } from "@/lib/i18n/client";

import { addCompanyTag, saveCompaniesToCrm, updateCompanyStatus } from "../../actions/companies";
import type { CompanyLead, CompanySignal } from "../../types";
import { ReviewList, type ReviewActions } from "../shared/review-list";
import { CompanyCard } from "./company-card";

const actions: ReviewActions = {
  approve: (ids) => updateCompanyStatus(ids, "shortlisted"),
  reject: (ids) => updateCompanyStatus(ids, "rejected"),
  save: (ids) => saveCompaniesToCrm(ids),
  review: (ids) => updateCompanyStatus(ids, "reviewed"),
  addTag: (ids, tag) => addCompanyTag(ids, tag),
};

export function CompanyList({ items, signals }: { items: CompanyLead[]; signals: Record<string, CompanySignal[]> }) {
  const { dict } = useI18n();
  return (
    <ReviewList
      items={items}
      actions={actions}
      saveLabel={dict.sourcing.review.saveToCrm}
      exportName="grafiq-companies"
      renderCard={(c, state) => <CompanyCard lead={c} signals={signals[c.id] ?? []} state={state} />}
      toCsvRow={(c) => ({
        name: c.name, website: c.website, industry: c.industry, country: c.country, city: c.city, employees: c.employeeCount,
        type: c.companyType, model: c.businessModel, founded: c.foundedYear, technologies: c.technologies.join("; "),
        signals: (signals[c.id] ?? []).map((s) => s.type).join("; "), score: c.manualScore ?? c.leadScore, status: c.status,
        crm: c.crmStatus, tags: c.tags.join("; "),
      })}
    />
  );
}
