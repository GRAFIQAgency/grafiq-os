import { createClient } from "@/lib/supabase/server";

import { HIGH_LEAD_SCORE, HIGH_TALENT_SCORE } from "../constants";

export interface OverviewStats {
  newTalentThisWeek: number;
  newLeadsThisWeek: number;
  savedSearches: number;
  highMatchTalent: number;
  highScoreLeads: number;
  sourcesWithErrors: number;
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const count = async (build: () => PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
    const { count: n, error } = await build();
    if (error) return 0;
    return n ?? 0;
  };

  const [newTalentThisWeek, newLeadsThisWeek, savedSearches, highMatchTalent, highScoreLeads, sourcesWithErrors] =
    await Promise.all([
      count(() => supabase.from("talent_candidates").select("id", { count: "exact", head: true }).gte("created_at", weekAgo)),
      count(() => supabase.from("company_leads").select("id", { count: "exact", head: true }).gte("created_at", weekAgo)),
      count(() => supabase.from("sourcing_searches").select("id", { count: "exact", head: true })),
      count(() => supabase.from("talent_candidates").select("id", { count: "exact", head: true }).gte("ai_score", HIGH_TALENT_SCORE)),
      count(() => supabase.from("company_leads").select("id", { count: "exact", head: true }).gte("lead_score", HIGH_LEAD_SCORE)),
      count(() => supabase.from("sourcing_sources").select("id", { count: "exact", head: true }).not("last_error", "is", null)),
    ]);

  return { newTalentThisWeek, newLeadsThisWeek, savedSearches, highMatchTalent, highScoreLeads, sourcesWithErrors };
}
