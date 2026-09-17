import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { MIN_TOKEN_LENGTH } from "./constants";

/**
 * Bearer-token authentication for the MCP endpoint.
 *
 * Hermes runs in the cloud and has no user account, so there is no session to
 * check: the only credential is `HERMES_API_TOKEN`. The comparison is
 * constant-time over SHA-256 digests, which keeps it independent of the
 * token's length as well as its content.
 */

export function isTokenConfigured(): boolean {
  return (process.env.HERMES_API_TOKEN ?? "").trim().length >= MIN_TOKEN_LENGTH;
}

/** Constant-time equality. Digesting first means unequal lengths leak nothing. */
export function verifyToken(presented: string | undefined | null): boolean {
  const expected = (process.env.HERMES_API_TOKEN ?? "").trim();
  if (expected.length < MIN_TOKEN_LENGTH) return false; // fail closed when unset or too weak
  if (!presented) return false;
  const a = createHash("sha256").update(presented).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Reads the token out of an `Authorization: Bearer <token>` header. */
export function bearerFromHeader(header: string | null): string | undefined {
  if (!header) return undefined;
  const [scheme, ...rest] = header.trim().split(/\s+/);
  if (scheme.toLowerCase() !== "bearer" || rest.length !== 1) return undefined;
  return rest[0];
}

/** Stable, non-reversible id for rate-limit buckets and logs. Never log the token itself. */
export function tokenFingerprint(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 12);
}
