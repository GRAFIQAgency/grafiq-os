import { getModule } from "@/config/modules";
import { moduleMetadata } from "@/lib/i18n/metadata";
import { getDictionary } from "@/lib/i18n/server";
import { Pagination } from "@/modules/sourcing/components/shared/pagination";
import { SearchToolbar } from "@/modules/sourcing/components/shared/search-toolbar";
import { TalentFiltersForm } from "@/modules/sourcing/components/talent/talent-filters";
import { TalentList } from "@/modules/sourcing/components/talent/talent-list";
import { listTalent } from "@/modules/sourcing/queries/talent";
import { parseListParams, parseTalentFilters, talentFiltersToParams } from "@/modules/sourcing/services/filters";

export const generateMetadata = moduleMetadata("sourcing");

export default async function SourcingTalentPage({ searchParams }: PageProps<"/sourcing/talent">) {
  const raw = await searchParams;
  const filters = parseTalentFilters(raw);
  const params = parseListParams(raw);
  const [dict, page] = await Promise.all([getDictionary(), listTalent(filters, params)]);
  const urlParams = talentFiltersToParams(filters);
  urlParams.set("sort", params.sort);

  return (
    <div className="space-y-4">
      <TalentFiltersForm filters={filters} dict={dict} />
      <SearchToolbar entityType="talent" />
      <TalentList items={page.items} />
      <Pagination basePath={`${getModule("sourcing").href}/talent`} params={urlParams} page={page.page} pageSize={page.pageSize} total={page.total} />
    </div>
  );
}
