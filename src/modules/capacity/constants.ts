import type { ProjectStatus } from "@/modules/projects/types";
import type { BenchStatus } from "@/types/database";

/**
 * Capacity rules live here, not in components. Percentages are 0–100.
 *
 * Health bands (utilization = booked / available):
 *   green   < YELLOW_FROM           healthy amount of free capacity
 *   yellow  YELLOW_FROM … ORANGE    getting close to full
 *   orange  ORANGE_FROM … RED       near full
 *   red     ≥ RED_FROM              over capacity
 */
export const UTILIZATION_YELLOW_FROM = 75;
export const UTILIZATION_ORANGE_FROM = 90;
export const UTILIZATION_RED_FROM = 100;

/** A person counts as "has free capacity" from this many remaining hours in the period. */
export const FREE_CAPACITY_MIN_HOURS = 8;

/** Weekly capacity = monthly capacity × 12 / 52 (average weeks per month). */
export const WEEKS_PER_MONTH = 52 / 12;

/**
 * Project statuses that consume capacity: genuinely in delivery. Draft is not
 * sold yet, on hold does not reserve time, closed states are over.
 * Mirrors projects' ACTIVE_STATUSES on purpose (kept explicit for tests).
 */
export const CAPACITY_PROJECT_STATUSES: readonly ProjectStatus[] = ["onboarding", "active", "waiting_client", "internal_review"];

/** Bench statuses under which a Talent person is plannable. */
export const PLANNABLE_BENCH_STATUSES: readonly BenchStatus[] = ["active", "preferred", "limited"];

/** Forward-planning matrix horizons in months. */
export const MATRIX_HORIZONS = [3, 4, 6] as const;
export const DEFAULT_MATRIX_HORIZON = 4;

/** Upper bound of people in one what-if role search. */
export const WHATIF_MAX_CANDIDATES = 8;
