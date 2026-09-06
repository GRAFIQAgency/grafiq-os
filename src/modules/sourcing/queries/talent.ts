import { createClient } from "@/lib/supabase/server";
import type { TalentCandidateRow } from "@/types/database";

import type { ListParams, Paged, TalentCandidate, TalentFilters } from "../types";
import { rowToTalent } from "./mappers";

/** Server-side filtered, paginated list. */
export async function listTalent(filters: TalentFilters, params: ListParams): Promise<Paged<TalentCandidate>> {
  const supabase = await createClient();
  let q = supabase.from("talent_candidates").select("*", { count: "exact" });

  if (filters.q) q = q.textSearch("search_vector", filters.q, { type: "websearch", config: "simple" });
  if (filters.role) q = q.ilike("role", `%${filters.role}%`);
  if (filters.skills?.length) q = q.overlaps("skills", filters.skills);
  if (filters.technologies?.length) q = q.overlaps("technologies", filters.technologies);
  if (filters.country) q = q.ilike("country", filters.country);
  if (filters.city) q = q.ilike("city", filters.city);
  if (filters.remote !== undefined) q = q.eq("remote", filters.remote);
  if (filters.seniority) q = q.eq("seniority", filters.seniority);
  if (filters.employmentType) q = q.eq("employment_type", filters.employmentType);
  if (filters.rateMin !== undefined) q = q.gte("hourly_rate_max", filters.rateMin);
  if (filters.rateMax !== undefined) q = q.lte("hourly_rate_min", filters.rateMax);
  if (filters.availability) q = q.eq("availability", filters.availability);
  if (filters.languages?.length) q = q.overlaps("languages", filters.languages);
  if (filters.minYears !== undefined) q = q.gte("years_experience", filters.minYears);
  if (filters.hasPortfolio) q = q.not("portfolio_url", "is", null);
  if (filters.agencyExperience !== undefined) q = q.eq("agency_experience", filters.agencyExperience);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.minScore !== undefined) q = q.gte("ai_score", filters.minScore);
  if (filters.tags?.length) q = q.overlaps("tags", filters.tags);
  if (filters.inBench !== undefined) q = q.eq("in_talent_bench", filters.inBench);

  q = params.sort === "score"
    ? q.order("ai_score", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false })
    : q.order("created_at", { ascending: false });

  const from = (params.page - 1) * params.pageSize;
  const { data, count, error } = await q.range(from, from + params.pageSize - 1).returns<TalentCandidateRow[]>();
  if (error) {
    console.error("[sourcing] listTalent failed:", error.message);
    return { items: [], total: 0, page: params.page, pageSize: params.pageSize };
  }
  return { items: (data ?? []).map(rowToTalent), total: count ?? 0, page: params.page, pageSize: params.pageSize };
}

export async function getTalent(id: string): Promise<TalentCandidate | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("talent_candidates").select("*").eq("id", id).maybeSingle<TalentCandidateRow>();
  if (error) {
    console.error("[sourcing] getTalent failed:", error.message);
    return null;
  }
  return data ? rowToTalent(data) : null;
}

export async function getTalentByIds(ids: string[]): Promise<TalentCandidate[]> {
  if (!ids.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("talent_candidates").select("*").in("id", ids).returns<TalentCandidateRow[]>();
  return (data ?? []).map(rowToTalent);
}
