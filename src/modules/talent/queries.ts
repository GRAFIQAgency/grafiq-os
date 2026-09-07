import { createClient } from "@/lib/supabase/server";
import { rowToTalent } from "@/modules/sourcing/queries/mappers";
import type { TalentBenchDetailsRow, TalentCandidateRow } from "@/types/database";

import { BENCH_LIST_LIMIT } from "./constants";
import { isAvailableForWork, matchesFilters, rowToDetails, sortPeople, toCapacityRecord, toTalentPerson } from "./services/bench";
import type { TalentCapacityRecord, TalentFilters, TalentPerson, TalentSort } from "./types";

type JoinedRow = TalentCandidateRow & { talent_bench_details: TalentBenchDetailsRow | TalentBenchDetailsRow[] | null };

const SELECT = "*, talent_bench_details(*)";

function joined(row: JoinedRow): TalentPerson {
  const d = Array.isArray(row.talent_bench_details) ? row.talent_bench_details[0] ?? null : row.talent_bench_details;
  return toTalentPerson(rowToTalent(row), d ? rowToDetails(d) : null);
}

/**
 * Bench membership rule (the only place it is decided):
 * - default: people with `in_talent_bench = true` (saved from Sourcing)
 * - status = archived: people whose bench details say archived (they left the bench, history intact)
 */
async function fetchBench(filters: TalentFilters): Promise<TalentPerson[]> {
  const supabase = await createClient();
  let q = supabase.from("talent_candidates").select(SELECT).limit(BENCH_LIST_LIMIT);
  q = filters.status === "archived"
    ? q.eq("talent_bench_details.bench_status", "archived").not("talent_bench_details", "is", null)
    : q.eq("in_talent_bench", true);
  const { data, error } = await q.returns<JoinedRow[]>();
  if (error) {
    console.error("[talent] fetchBench failed:", error.message);
    return [];
  }
  return (data ?? []).map(joined);
}

export async function listBench(filters: TalentFilters, sort: TalentSort): Promise<TalentPerson[]> {
  const people = await fetchBench(filters);
  return sortPeople(people.filter((p) => matchesFilters(p, filters)), sort);
}

/** One bench member (or archived member) by shared person id. */
export async function getBenchPerson(id: string): Promise<TalentPerson | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("talent_candidates").select(SELECT).eq("id", id).maybeSingle<JoinedRow>();
  if (error || !data) return null;
  const person = joined(data);
  const onBench = person.candidate.inTalentBench || person.details.benchStatus === "archived";
  return onBench ? person : null;
}

// ---------------------------------------------------------------------------
// Read API for future modules (Projects, Capacity, Pricing). Keep these stable.
// ---------------------------------------------------------------------------

export async function listActiveTalent(): Promise<TalentCapacityRecord[]> {
  const people = await fetchBench({});
  return people.filter((p) => p.details.benchStatus !== "archived").map(toCapacityRecord);
}

export async function listAvailableTalent(): Promise<TalentCapacityRecord[]> {
  const people = await fetchBench({});
  return people.filter((p) => isAvailableForWork(p)).map(toCapacityRecord);
}

export async function listTalentByRole(role: string): Promise<TalentCapacityRecord[]> {
  const people = await fetchBench({ role });
  return people.filter((p) => matchesFilters(p, { role })).map(toCapacityRecord);
}

/** Everything a capacity planner needs, one row per bench member. */
export async function getTalentCapacityData(): Promise<TalentCapacityRecord[]> {
  return (await fetchBench({})).map(toCapacityRecord);
}
