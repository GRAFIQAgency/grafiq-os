/** Limits and defaults of the Hermes MCP endpoint. Shared by tools and docs. */

/** Rows returned when a tool is called without `limit`. */
export const DEFAULT_LIMIT = 25;
/** Hard ceiling for any single tool call — the endpoint never streams the whole database. */
export const MAX_LIMIT = 100;
/** Widest window `deadlines_due` will look ahead. */
export const MAX_DEADLINE_DAYS = 90;
/** Widest range `capacity_snapshot` will cover. */
export const MAX_RANGE_DAYS = 180;
/** Free-text fields the agent may write (proposal reasons, notes, task titles). */
export const MAX_TEXT = 2000;

/** Requests allowed per token inside one window. In-memory, per server instance. */
export const RATE_LIMIT_REQUESTS = 60;
export const RATE_LIMIT_WINDOW_MS = 60_000;

/** A token shorter than this is treated as unset — the endpoint then rejects everything. */
export const MIN_TOKEN_LENGTH = 24;

/** Who the proposals are attributed to. */
export const PROPOSED_BY = "hermes";

/** Where a human decides on the proposals. */
export const PENDING_ROUTE = "/admin/pending";
