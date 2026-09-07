import { notFound } from "next/navigation";

import { getDictionary, getLocale } from "@/lib/i18n/server";
import { getEntityExtras } from "@/modules/sourcing/queries/entity-extras";
import { TalentDetail } from "@/modules/talent/components/talent-detail";
import { getBenchPerson } from "@/modules/talent/queries";

export async function generateMetadata({ params }: PageProps<"/talent/[id]">) {
  const { id } = await params;
  const person = await getBenchPerson(id);
  return { title: person?.candidate.fullName ?? "Talent" };
}

export default async function TalentPersonPage({ params }: PageProps<"/talent/[id]">) {
  const { id } = await params;
  const [person, dict, locale] = await Promise.all([getBenchPerson(id), getDictionary(), getLocale()]);
  if (!person) notFound();
  const extras = await getEntityExtras("talent", id);

  return <TalentDetail person={person} notes={extras.notes} activity={extras.activity} sources={extras.sources} dict={dict} locale={locale} />;
}
