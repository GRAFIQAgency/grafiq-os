import { notFound } from "next/navigation";

import { getDictionary, getLocale } from "@/lib/i18n/server";
import { personLoad } from "@/modules/capacity/calculations/load";
import { parsePeriodKey, toDateString } from "@/modules/capacity/calculations/periods";
import { PersonDetail } from "@/modules/capacity/components/person-detail";
import { getProfileCapacity, loadCapacityDataset } from "@/modules/capacity/queries";
import { parsePeriodKind } from "@/modules/capacity/services/filters";
import { flattenParams } from "@/modules/capacity/services/links";

function decodeKey(key: string): string {
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

export async function generateMetadata({ params }: PageProps<"/capacity/[key]">) {
  const { key } = await params;
  const data = await loadCapacityDataset();
  const person = data.people.find((p) => p.key === decodeKey(key));
  return { title: person?.name ?? "Capacity" };
}

export default async function CapacityPersonPage({ params, searchParams }: PageProps<"/capacity/[key]">) {
  const [{ key }, raw] = await Promise.all([params, searchParams]);
  const personKey = decodeKey(key);
  const [dict, locale, data] = await Promise.all([getDictionary(), getLocale(), loadCapacityDataset()]);
  const person = data.people.find((p) => p.key === personKey);
  if (!person) notFound();

  const query = flattenParams(raw);
  const kind = parsePeriodKind(raw);
  const period = parsePeriodKey(query.period, kind, toDateString(new Date()));
  const load = personLoad(person, data.assignments, period);
  const profileCapacity = person.kind === "user" ? await getProfileCapacity(person.id) : null;

  return <PersonDetail load={load} params={{ kind: query.kind, period: query.period }} profileCapacity={profileCapacity} dict={dict} locale={locale} />;
}
