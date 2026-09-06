import { notFound } from "next/navigation";

import { moduleMetadata } from "@/lib/i18n/metadata";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { CompanyDetail } from "@/modules/sourcing/components/companies/company-detail";
import { getCompany, listCompanyContacts, listCompanySignals } from "@/modules/sourcing/queries/companies";
import { getEntityExtras } from "@/modules/sourcing/queries/entity-extras";
import { isClaudeScoringEnabled } from "@/modules/sourcing/scoring";

export const generateMetadata = moduleMetadata("sourcing");

export default async function CompanyDetailPage({ params }: PageProps<"/sourcing/companies/[id]">) {
  const { id } = await params;
  const lead = await getCompany(id);
  if (!lead) notFound();

  const [dict, locale, extras, signals, contacts] = await Promise.all([
    getDictionary(), getLocale(), getEntityExtras("company", id), listCompanySignals(id), listCompanyContacts(id),
  ]);
  return (
    <CompanyDetail
      lead={lead}
      signals={signals}
      contacts={contacts}
      evaluations={extras.evaluations}
      notes={extras.notes}
      activity={extras.activity}
      sources={extras.sources}
      aiEnabled={isClaudeScoringEnabled()}
      dict={dict}
      locale={locale}
    />
  );
}
