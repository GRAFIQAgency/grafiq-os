import { afterEach, describe, expect, it } from "vitest";

import { bearerFromHeader, isTokenConfigured, tokenFingerprint, verifyToken } from "./auth";
import { MAX_LIMIT, MAX_RANGE_DAYS, MIN_TOKEN_LENGTH, RATE_LIMIT_REQUESTS } from "./constants";
import { checkRateLimit, resetRateLimits } from "./rate-limit";
import { money, sumByCurrency } from "./reads/shared";
import {
  capacitySnapshotSchema, clientNoteAddSchema, projectStatusSetSchema, projectsOverviewSchema,
  receivableMarkPaidSchema, talentAvailableSchema,
} from "./schemas";

const TOKEN = "hermes_test_token_that_is_long_enough_123";

afterEach(() => {
  delete process.env.HERMES_API_TOKEN;
  resetRateLimits();
});

describe("bearer authentication", () => {
  it("fails closed when the token is unset or too weak", () => {
    expect(isTokenConfigured()).toBe(false);
    expect(verifyToken(TOKEN)).toBe(false);
    process.env.HERMES_API_TOKEN = "short";
    expect(isTokenConfigured()).toBe(false);
    expect(verifyToken("short")).toBe(false); // a weak token never authenticates, even if it matches
    expect("short".length).toBeLessThan(MIN_TOKEN_LENGTH);
  });

  it("accepts only the exact token", () => {
    process.env.HERMES_API_TOKEN = TOKEN;
    expect(isTokenConfigured()).toBe(true);
    expect(verifyToken(TOKEN)).toBe(true);
    expect(verifyToken(`${TOKEN}x`)).toBe(false);
    expect(verifyToken(TOKEN.slice(0, -1))).toBe(false);
    expect(verifyToken(TOKEN.toUpperCase())).toBe(false);
    expect(verifyToken(undefined)).toBe(false);
    expect(verifyToken("")).toBe(false);
  });

  it("compares digests, so a wrong length is not an early exit", () => {
    process.env.HERMES_API_TOKEN = TOKEN;
    // Both of these hash to 32 bytes and go through timingSafeEqual.
    expect(verifyToken("x")).toBe(false);
    expect(verifyToken("x".repeat(5000))).toBe(false);
  });

  it("parses the Authorization header and never echoes the token", () => {
    expect(bearerFromHeader(`Bearer ${TOKEN}`)).toBe(TOKEN);
    expect(bearerFromHeader(`bearer ${TOKEN}`)).toBe(TOKEN);
    expect(bearerFromHeader(`Basic ${TOKEN}`)).toBeUndefined();
    expect(bearerFromHeader(TOKEN)).toBeUndefined();
    expect(bearerFromHeader(null)).toBeUndefined();
    const fingerprint = tokenFingerprint(TOKEN);
    expect(fingerprint).toHaveLength(12);
    expect(TOKEN).not.toContain(fingerprint);
  });
});

describe("rate limit", () => {
  it("allows the window's budget and then refuses until it resets", () => {
    const key = "abc";
    for (let i = 0; i < RATE_LIMIT_REQUESTS; i += 1) expect(checkRateLimit(key, 1_000).ok).toBe(true);
    const blocked = checkRateLimit(key, 1_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(checkRateLimit(key, 1_000 + 60_001).ok).toBe(true); // new window
    expect(checkRateLimit("other", 1_000).ok).toBe(true); // buckets are per token
  });
});

describe("input validation", () => {
  it("rejects anything that is not an enumerated argument", () => {
    expect(projectsOverviewSchema.safeParse({ status: "active" }).success).toBe(true);
    expect(projectsOverviewSchema.safeParse({ status: "'; drop table projects;--" }).success).toBe(false);
    expect(projectsOverviewSchema.safeParse({ clientId: "not-a-uuid" }).success).toBe(false);
    expect(projectsOverviewSchema.safeParse({ limit: MAX_LIMIT + 1 }).success).toBe(false);
    expect(projectsOverviewSchema.safeParse({ limit: MAX_LIMIT }).success).toBe(true);
    // No table, column or ordering can be passed in: unknown keys are dropped.
    const parsed = projectsOverviewSchema.parse({ status: "active", table: "auth.users", orderBy: "id" } as never);
    expect(Object.keys(parsed)).toEqual(["status"]);
  });

  it("caps the capacity window and checks the date order", () => {
    expect(capacitySnapshotSchema.safeParse({ from: "2026-09-01", to: "2026-09-30" }).success).toBe(true);
    expect(capacitySnapshotSchema.safeParse({ from: "2026-09-30", to: "2026-09-01" }).success).toBe(false);
    expect(capacitySnapshotSchema.safeParse({ from: "01/09/2026", to: "2026-09-30" }).success).toBe(false);
    const tooWide = { from: "2026-01-01", to: "2027-12-31" };
    expect((Date.parse(tooWide.to) - Date.parse(tooWide.from)) / 86400000).toBeGreaterThan(MAX_RANGE_DAYS);
    expect(capacitySnapshotSchema.safeParse(tooWide).success).toBe(false);
  });

  it("requires a stated reason for every proposal", () => {
    const id = "6f1d2f7c-0f6e-4d1a-9a1e-2b3c4d5e6f70";
    expect(projectStatusSetSchema.safeParse({ projectId: id, status: "completed", reason: "QA approved last week" }).success).toBe(true);
    expect(projectStatusSetSchema.safeParse({ projectId: id, status: "completed" }).success).toBe(false);
    expect(projectStatusSetSchema.safeParse({ projectId: id, status: "completed", reason: "ok" }).success).toBe(false);
    expect(projectStatusSetSchema.safeParse({ projectId: id, status: "finished", reason: "a good reason" }).success).toBe(false);
    expect(clientNoteAddSchema.safeParse({ companyId: id, body: "", reason: "a good reason" }).success).toBe(false);
    expect(receivableMarkPaidSchema.safeParse({ receivableId: id, amount: -5, reason: "a good reason" }).success).toBe(false);
  });

  it("keeps talent queries to role and dates — there is no field for contact details", () => {
    const parsed = talentAvailableSchema.parse({ role: "3D", email: "x@y.z", phone: "123" } as never);
    expect(Object.keys(parsed)).toEqual(["role"]);
  });
});

describe("money", () => {
  it("never merges currencies", () => {
    const totals = sumByCurrency([
      { amount: 100, currency: "CZK" },
      { amount: 50, currency: "EUR" },
      { amount: 250, currency: "CZK" },
    ]);
    expect(totals).toEqual([money(350, "CZK"), money(50, "EUR")]);
    expect(totals.every((t) => typeof t.currency === "string")).toBe(true);
    expect(totals.find((t) => t.amount === 400)).toBeUndefined();
  });

  it("carries the currency on every amount", () => {
    expect(money(1234.567, "EUR")).toEqual({ amount: 1234.57, currency: "EUR" });
  });
});
