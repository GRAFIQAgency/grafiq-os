import { createClient } from "@/lib/supabase/server";
import type { SourcingSearchRow, SourcingSearchRunRow } from "@/types/database";

import type { SavedSearch, SearchRun } from "../types";
import { rowToRun, rowToSavedSearch } from "./mappers";

export async function listSavedSearches(): Promise<SavedSearch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sourcing_searches").select("*").order("created_at", { ascending: false }).returns<SourcingSearchRow[]>();
  if (error) {
    console.error("[sourcing] listSavedSearches failed:", error.message);
    return [];
  }
  return (data ?? []).map(rowToSavedSearch);
}

export async function getSavedSearch(id: string): Promise<SavedSearch | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("sourcing_searches").select("*").eq("id", id).maybeSingle<SourcingSearchRow>();
  return data ? rowToSavedSearch(data) : null;
}

export async function listRecentRuns(limit = 8): Promise<SearchRun[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sourcing_search_runs").select("*").order("created_at", { ascending: false }).limit(limit).returns<SourcingSearchRunRow[]>();
  if (error) {
    console.error("[sourcing] listRecentRuns failed:", error.message);
    return [];
  }
  return (data ?? []).map(rowToRun);
}
