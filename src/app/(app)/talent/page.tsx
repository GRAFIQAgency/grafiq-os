import { PageHeader } from "@/components/shared/page-header";
import { moduleMetadata } from "@/lib/i18n/metadata";
import { interpolate } from "@/lib/i18n/interpolate";
import { getDictionary } from "@/lib/i18n/server";
import { AddPersonSheet } from "@/modules/talent/components/add-person-sheet";
import { TalentFiltersForm } from "@/modules/talent/components/talent-filters";
import { TalentTable } from "@/modules/talent/components/talent-table";
import { listBench } from "@/modules/talent/queries";
import { parseTalentFilters, parseTalentSort } from "@/modules/talent/services/filters";

export const generateMetadata = moduleMetadata("talent");

export default async function TalentPage({ searchParams }: PageProps<"/talent">) {
  const params = await searchParams;
  const filters = parseTalentFilters(params);
  const sort = parseTalentSort(params);
  const [dict, people] = await Promise.all([getDictionary(), listBench(filters, sort)]);
  const filtered = Object.keys(filters).length > 0;

  return (
    <div className="space-y-6">
      <PageHeader title={dict.talent.title} description={dict.talent.description} actions={<AddPersonSheet />} />
      <TalentFiltersForm filters={filters} sort={sort} dict={dict} />
      <p className="text-sm text-muted-foreground">{interpolate(dict.talent.count, { n: people.length })}</p>
      <TalentTable people={people} dict={dict} filtered={filtered} />
    </div>
  );
}
