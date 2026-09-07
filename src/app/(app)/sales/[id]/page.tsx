import { notFound } from "next/navigation";

import { getDictionary, getLocale } from "@/lib/i18n/server";
import { DealDetail } from "@/modules/sales/components/deal-detail";
import { getDeal, getSalesPickers, listDealContacts, listDealProjects } from "@/modules/sales/queries";
import { listCompanySignals } from "@/modules/sourcing/queries/companies";
import { getEntityExtras } from "@/modules/sourcing/queries/entity-extras";

export async function generateMetadata({ params }: PageProps<"/sales/[id]">) {
  const { id } = await params;
  const deal = await getDeal(id);
  return { title: deal?.company.name ?? "Sales" };
}

export default async function DealPage({ params }: PageProps<"/sales/[id]">) {
  const { id } = await params;
  const [deal, dict, locale] = await Promise.all([getDeal(id), getDictionary(), getLocale()]);
  if (!deal) notFound();
  const [extras, contacts, signals, projects, pickers] = await Promise.all([
    getEntityExtras("company", id), listDealContacts(id), listCompanySignals(id), listDealProjects(id), getSalesPickers(),
  ]);

  return (
    <DealDetail
      deal={deal}
      contacts={contacts}
      signals={signals}
      projects={projects}
      notes={extras.notes}
      activity={extras.activity}
      pickers={pickers}
      dict={dict}
      locale={locale}
    />
  );
}
