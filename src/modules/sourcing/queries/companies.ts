import { createClient } from "@/lib/supabase/server";
import type { CompanyContactRow, CompanyLeadRow, CompanySignalRow } from "@/types/database";

import type { CompanyContact, CompanyFilters, CompanyLead, CompanySignal, ListParams, Paged } from "../types";
import { rowToCompany, rowToContact, rowToSignal } from "./mappers";

export async function listCompanies(filters: CompanyFilters, params: ListParams): Promise<Paged<CompanyLead>> {
  const supabase = await createClient();
  let q = supabase.from("company_leads").select("*", { count: "exact" });

  if (filters.q) q = q.textSearch("search_vector", filters.q, { type: "websearch", config: "simple" });
  if (filters.country) q = q.ilike("country", filters.country);
  if (filters.city) q = q.ilike("city", filters.city);
  if (filters.industry) q = q.ilike("industry", `%${filters.industry}%`);
  if (filters.sizeBucket) q = q.eq("size_bucket", filters.sizeBucket);
  if (filters.employeesMin !== undefined) q = q.gte("employee_count", filters.employeesMin);
  if (filters.employeesMax !== undefined) q = q.lte("employee_count", filters.employeesMax);
  if (filters.technologies?.length) q = q.overlaps("technologies", filters.technologies);
  if (filters.keywords?.length) q = q.overlaps("keywords", filters.keywords.map((k) => k.toLowerCase()));
  if (filters.foundedAfter !== undefined) q = q.gte("founded_year", filters.foundedAfter);
  if (filters.foundedBefore !== undefined) q = q.lte("founded_year", filters.foundedBefore);
  if (filters.businessModel) q = q.eq("business_model", filters.businessModel);
  if (filters.companyType) q = q.eq("company_type", filters.companyType);
  if (filters.language) q = q.ilike("language", filters.language);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.minScore !== undefined) q = q.gte("lead_score", filters.minScore);
  if (filters.tags?.length) q = q.overlaps("tags", filters.tags);
  if (filters.inCrm !== undefined) q = filters.inCrm ? q.not("crm_status", "is", null) : q.is("crm_status", null);

  if (filters.signals?.length) {
    // Companies having at least one of the requested signal types.
    const { data: withSignal } = await supabase
      .from("company_signals")
      .select("company_id")
      .in("type", filters.signals)
      .returns<{ company_id: string }[]>();
    const ids = [...new Set((withSignal ?? []).map((r) => r.company_id))];
    if (!ids.length) return { items: [], total: 0, page: params.page, pageSize: params.pageSize };
    q = q.in("id", ids);
  }

  q = params.sort === "score"
    ? q.order("lead_score", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false })
    : q.order("created_at", { ascending: false });

  const from = (params.page - 1) * params.pageSize;
  const { data, count, error } = await q.range(from, from + params.pageSize - 1).returns<CompanyLeadRow[]>();
  if (error) {
    console.error("[sourcing] listCompanies failed:", error.message);
    return { items: [], total: 0, page: params.page, pageSize: params.pageSize };
  }
  return { items: (data ?? []).map(rowToCompany), total: count ?? 0, page: params.page, pageSize: params.pageSize };
}

export async function getCompany(id: string): Promise<CompanyLead | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("company_leads").select("*").eq("id", id).maybeSingle<CompanyLeadRow>();
  if (error) {
    console.error("[sourcing] getCompany failed:", error.message);
    return null;
  }
  return data ? rowToCompany(data) : null;
}

export async function getCompaniesByIds(ids: string[]): Promise<CompanyLead[]> {
  if (!ids.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("company_leads").select("*").in("id", ids).returns<CompanyLeadRow[]>();
  return (data ?? []).map(rowToCompany);
}

/** Signals for a set of companies, grouped by company id (for result cards). */
export async function listSignalsForCompanies(ids: string[]): Promise<Record<string, CompanySignal[]>> {
  if (!ids.length) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_signals")
    .select("*")
    .in("company_id", ids)
    .order("detected_at", { ascending: false })
    .returns<CompanySignalRow[]>();
  const grouped: Record<string, CompanySignal[]> = {};
  for (const row of data ?? []) (grouped[row.company_id] ??= []).push(rowToSignal(row));
  return grouped;
}

export async function listCompanySignals(companyId: string): Promise<CompanySignal[]> {
  return (await listSignalsForCompanies([companyId]))[companyId] ?? [];
}

export async function listCompanyContacts(companyId: string): Promise<CompanyContact[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("company_contacts").select("*").eq("company_id", companyId).returns<CompanyContactRow[]>();
  return (data ?? []).map(rowToContact);
}
