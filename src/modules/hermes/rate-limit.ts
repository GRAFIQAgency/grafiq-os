import "server-only";

import { RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS } from "./constants";

/**
 * Fixed-window rate limit, in memory.
 *
 * Deliberately simple: the endpoint has exactly one client. It protects
 * against a runaway agent loop, not against a distributed attacker — the
 * bearer token does that. On serverless each instance keeps its own counter,
 * so the effective limit is per instance.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(key: string, now = Date.now()): RateLimitResult {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: RATE_LIMIT_REQUESTS - 1, resetAt };
  }
  if (bucket.count >= RATE_LIMIT_REQUESTS) return { ok: false, remaining: 0, resetAt: bucket.resetAt };
  bucket.count += 1;
  return { ok: true, remaining: RATE_LIMIT_REQUESTS - bucket.count, resetAt: bucket.resetAt };
}

/** Test helper: forget every bucket. */
export function resetRateLimits() {
  buckets.clear();
}
