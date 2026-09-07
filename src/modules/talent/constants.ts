import type { BenchStatus, EngagementType, PricingModel, TalentSort } from "./types";

export const BENCH_STATUSES: readonly BenchStatus[] = ["active", "preferred", "limited", "unavailable", "paused", "archived"];
export const ENGAGEMENT_TYPES: readonly EngagementType[] = ["freelancer", "contractor", "part_time", "employee", "other"];
/** Pay models: per hour, fixed per project, or a percentage of the client price. */
export const PRICING_MODELS: readonly PricingModel[] = ["hourly", "fixed", "percent"];
export const TALENT_SORTS: readonly TalentSort[] = ["quality", "reliability", "cost", "availability", "name", "recent"];

/** Bench statuses under which a person can be staffed. */
export const STAFFABLE_STATUSES: readonly BenchStatus[] = ["active", "preferred", "limited"];

/** Upper bound of people loaded for the bench list (sorted/filtered in memory; bench stays small). */
export const BENCH_LIST_LIMIT = 500;
