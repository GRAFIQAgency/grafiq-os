/**
 * Presentation helpers for the shared activity log. The rows come from the
 * existing `activity_log` table (one entry per entity); Dashboard only decides
 * where each entity links and which dictionary label to use.
 */
import type { RecentActivityEntry } from "@/modules/sourcing/queries/activity";

export interface ActivityHrefs {
  project: (id: string) => string;
  company: (id: string) => string;
  talent: (id: string) => string;
}

export interface ActivityFeedItem extends RecentActivityEntry {
  href: string | null;
  /** Short "key: value" line built from the details JSON (no objects). */
  detail: string;
}

export function toActivityFeed(entries: readonly RecentActivityEntry[], hrefs: ActivityHrefs): ActivityFeedItem[] {
  return entries.map((e) => ({
    ...e,
    href: e.entityType === "project" ? hrefs.project(e.entityId)
      : e.entityType === "company" ? hrefs.company(e.entityId)
        : e.entityType === "talent" ? hrefs.talent(e.entityId)
          : null,
    detail: Object.entries(e.details)
      .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
      .slice(0, 3)
      .map(([, v]) => String(v))
      .join(" · "),
  }));
}
