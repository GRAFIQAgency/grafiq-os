import { STALE_AFTER_DAYS } from "../constants";

/** True when a record has not been checked against its sources recently. */
export function isStale(lastCheckedAt: string, now = new Date()): boolean {
  const ageMs = now.getTime() - new Date(lastCheckedAt).getTime();
  return ageMs > STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
}
