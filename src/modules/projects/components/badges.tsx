import { StatusBadge } from "@/components/shared/status-badge";
import type { Dictionary } from "@/lib/i18n/config";

import type { HealthReason, ProjectHealth, ProjectPriority, ProjectStatus } from "../types";
import { interpolate } from "@/lib/i18n/interpolate";

const STATUS_TONE: Record<ProjectStatus, string> = {
  draft: "discovered", onboarding: "shortlisted", active: "approved", waiting_client: "interview", internal_review: "interview",
  completed: "reviewed", on_hold: "archived", cancelled: "rejected", archived: "archived",
};
const HEALTH_TONE: Record<ProjectHealth, string> = { healthy: "approved", attention: "interview", at_risk: "shortlisted", critical: "rejected" };
const PRIORITY_TONE: Record<ProjectPriority, string> = { low: "archived", normal: "discovered", high: "shortlisted", critical: "rejected" };

export function ProjectStatusBadge({ status, dict }: { status: ProjectStatus; dict: Dictionary }) {
  return <StatusBadge status={STATUS_TONE[status]} label={dict.projects.statuses[status]} />;
}
export function HealthBadge({ health, dict, className }: { health: ProjectHealth; dict: Dictionary; className?: string }) {
  return <StatusBadge status={HEALTH_TONE[health]} label={dict.projects.health[health]} className={className} />;
}
export function PriorityBadge({ priority, dict }: { priority: ProjectPriority; dict: Dictionary }) {
  return <StatusBadge status={PRIORITY_TONE[priority]} label={dict.projects.priorities[priority]} />;
}

export function healthReasonText(reason: HealthReason, dict: Dictionary): string {
  return interpolate(dict.projects.healthReasons[reason.code], reason.params);
}

export function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div className={className}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-foreground transition-[width]" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
      </div>
    </div>
  );
}
