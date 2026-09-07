import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { listRecentEstimates } from "@/modules/pricing/queries";
import { listProjectsByClient } from "@/modules/projects/queries";
import { rowToCompany, rowToContact } from "@/modules/sourcing/queries/mappers";
import type { CompanyContact } from "@/modules/sourcing/types";
import type { CompanyContactRow, CompanyCrmDetailsRow, CompanyLeadRow, ProfileRow } from "@/types/database";

import { PIPELINE_LIST_LIMIT } from "./constants";
import { matchesFilters, pipelineStats, rowToDetails, sortDeals, toCustomerRecord, toDeal } from "./services/pipeline";
import type { CustomerRecord, Deal, DealFilters, DealProject, DealSort, PipelineStats, SalesPickers } from "./types";

type JoinedRow = CompanyLeadRow & { company_crm_details: CompanyCrmDetailsRow | CompanyCrmDetailsRow[] | null };

const SELECT = "*, company_crm_details(*)";

type Names = { owners: Map<string, string>; estimates: Map<string, string> };

function detailsOf(row: JoinedRow): CompanyCrmDetailsRow | null {
  return Array.isArray(row.company_crm_details) ? row.company_crm_details[0] ?? null : row.company_crm_details;
}

function joined(row: JoinedRow, names: Names, today: Date): Deal {
  const d = detailsOf(row);
  return toDeal(rowToCompany(row), d ? rowToDetails(d) : null, {
    ownerName: d?.owner_id ? names.owners.get(d.owner_id) ?? null : null,
    estimateName: d?.pricing_estimate_id ? names.estimates.get(d.pricing_estimate_id) ?? null : null,
  }, today);
}

/** Owner and estimate names for a set of rows — two small lookups instead of embedded joins. */
async function loadNames(rows: JoinedRow[]): Promise<Names> {
  const supabase = await createClient();
  const ownerIds = [...new Set(rows.map((r) => detailsOf(r)?.owner_id).filter((x): x is string => Boolean(x)))];
  const estimateIds = [...new Set(rows.map((r) => detailsOf(r)?.pricing_estimate_id).filter((x): x is string => Boolean(x)))];
  const [owners, estimates] = await Promise.all([
    ownerIds.length ? supabase.from("profiles").select("id, full_name, email").in("id", ownerIds).returns<Pick<ProfileRow, "id" | "full_name" | "email">[]>() : Promise.resolve({ data: [] as Pick<ProfileRow, "id" | "full_name" | "email">[] }),
    estimateIds.length ? supabase.from("pricing_estimates").select("id, project_name").in("id", estimateIds).returns<{ id: string; project_name: string }[]>() : Promise.resolve({ data: [] as { id: string; project_name: string }[] }),
  ]);
  return {
    owners: new Map((owners.data ?? []).map((o) => [o.id, o.full_name || o.email])),
    estimates: new Map((estimates.data ?? []).map((e) => [e.id, e.project_name])),
  };
}

/**
 * Pipeline membership rule (the only place it is decided):
 * a company is a deal when `crm_status` is set — by "Save to CRM" in Sourcing
 * or "Add company" in Sales. Closed deals (customer / lost) stay in the list.
 */
async function fetchPipeline(): Promise<Deal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_leads")
    .select(SELECT)
    .not("crm_status", "is", null)
    .order("crm_added_at", { ascending: false, nullsFirst: false })
    .limit(PIPELINE_LIST_LIMIT)
    .returns<JoinedRow[]>();
  if (error) {
    console.error("[sales] fetchPipeline failed:", error.message);
    return [];
  }
  const rows = data ?? [];
  const names = await loadNames(rows);
  const today = new Date();
  return rows.map((r) => joined(r, names, today));
}

export async function listDeals(filters: DealFilters, sort: DealSort): Promise<Deal[]> {
  const deals = await fetchPipeline();
  return sortDeals(deals.filter((d) => matchesFilters(d, filters)), sort);
}

/** One deal by shared company id. Null when the company is not in CRM. */
export async function getDeal(id: string): Promise<Deal | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("company_leads").select(SELECT).eq("id", id).maybeSingle<JoinedRow>();
  if (error || !data || !data.crm_status) return null;
  const names = await loadNames([data]);
  return joined(data, names, new Date());
}

export async function listDealContacts(companyId: string): Promise<CompanyContact[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("company_contacts").select("*").eq("company_id", companyId).order("created_at").returns<CompanyContactRow[]>();
  return (data ?? []).map(rowToContact);
}

/** Projects delivered for this company (read through the Projects module). */
export async function listDealProjects(companyId: string): Promise<DealProject[]> {
  const projects = await listProjectsByClient(companyId);
  return projects.map((p) => ({ id: p.id, name: p.name, status: p.status, deadline: p.deadline, revenue: p.baselineRevenue, currency: p.currency }));
}

export const getSalesPickers = cache(async (): Promise<SalesPickers> => {
  const supabase = await createClient();
  const [owners, estimates] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").order("full_name").returns<Pick<ProfileRow, "id" | "full_name" | "email">[]>(),
    listRecentEstimates(),
  ]);
  return {
    owners: (owners.data ?? []).map((o) => ({ id: o.id, label: o.full_name || o.email, hint: o.full_name ? o.email : undefined })),
    estimates: estimates.map((e) => ({ id: e.id, label: e.projectName, hint: e.clientName ?? undefined })),
  };
});

// ---------------------------------------------------------------------------
// Read API for other modules (Dashboard, Finance, Projects). Keep these stable.
// ---------------------------------------------------------------------------

export async function getPipelineStats(): Promise<PipelineStats> {
  return pipelineStats(await fetchPipeline(), new Date());
}

/** Companies that became customers (stage = customer). */
export async function listCustomers(): Promise<CustomerRecord[]> {
  const deals = await fetchPipeline();
  return deals.filter((d) => d.stage === "customer").map(toCustomerRecord);
}

/** Every company in the pipeline, compact. */
export async function listPipelineCompanies(): Promise<CustomerRecord[]> {
  return (await fetchPipeline()).map(toCustomerRecord);
}
