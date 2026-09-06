import { getModule } from "@/config/modules";
import { moduleMetadata } from "@/lib/i18n/metadata";
import { getDictionary } from "@/lib/i18n/server";
import { CompanyFiltersForm } from "@/modules/sourcing/components/companies/company-filters";
import { CompanyList } from "@/modules/sourcing/components/companies/company-list";
import { Pagination } from "@/modules/sourcing/components/shared/pagination";
import { SearchToolbar } from "@/modules/sourcing/components/shared/search-toolbar";
import { listCompanies, listSignalsForCompanies } from "@/modules/sourcing/queries/companies";
import { companyFiltersToParams, parseCompanyFilters, parseListParams } from "@/modules/sourcing/services/filters";

export const generateMetadata = moduleMetadata("sourcing");

export default async function SourcingCompaniesPage({ searchParams }: PageProps<"/sourcing/companies">) {
  const raw = await searchParams;
  const filters = parseCompanyFilters(raw);
  const params = parseListParams(raw);
  const [dict, page] = await Promise.all([getDictionary(), listCompanies(filters, params)]);
  const signals = await listSignalsForCompanies(page.items.map((c) => c.id));
  const urlParams = companyFiltersToParams(filters);
  urlParams.set("sort", params.sort);

  return (
    <div className="space-y-4">
      <CompanyFiltersForm filters={filters} dict={dict} />
      <SearchToolbar entityType="company" />
      <CompanyList items={page.items} signals={signals} />
      <Pagination basePath={`${getModule("sourcing").href}/companies`} params={urlParams} page={page.page} pageSize={page.pageSize} total={page.total} />
    </div>
  );
}
