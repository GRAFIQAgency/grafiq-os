import { FREE_CAPACITY_MIN_HOURS, UTILIZATION_ORANGE_FROM, UTILIZATION_RED_FROM, UTILIZATION_YELLOW_FROM } from "../constants";
import type { CapacityHealth } from "../types";

/** Utilization in percent; null when there is no capacity to compare against. */
export function utilization(booked: number, available: number | null): number | null {
  if (available == null || available <= 0) return null;
  return Math.round((booked / available) * 1000) / 10;
}

/**
 * Health from the constants in constants.ts:
 *   unconfigured  no capacity number
 *   unavailable   capacity is 0 for the period (and nothing booked)
 *   red           ≥ 100 % (or hours booked against 0 capacity)
 *   orange        ≥ 90 %
 *   yellow        ≥ 75 %
 *   green         below
 */
export function healthFor(booked: number, available: number | null): CapacityHealth {
  if (available == null) return "unconfigured";
  if (available <= 0) return booked > 0 ? "red" : "unavailable";
  const u = (booked / available) * 100;
  if (u >= UTILIZATION_RED_FROM) return "red";
  if (u >= UTILIZATION_ORANGE_FROM) return "orange";
  if (u >= UTILIZATION_YELLOW_FROM) return "yellow";
  return "green";
}

export function isOverloaded(booked: number, available: number | null): boolean {
  return available != null && booked > available;
}

/** "Meaningful free capacity": below the yellow band and at least FREE_CAPACITY_MIN_HOURS left. */
export function hasFreeCapacity(booked: number, available: number | null): boolean {
  if (available == null || available <= 0) return false;
  return available - booked >= FREE_CAPACITY_MIN_HOURS && (booked / available) * 100 < UTILIZATION_YELLOW_FROM;
}
