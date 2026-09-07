/**
 * Explainable project health. Pure and tested. Every reason carries a code +
 * params so the UI can translate it ("Development milestone is 4 days overdue").
 */
import { CLOSED_STATUSES, HEALTH_RULES } from "../constants";
import type { HealthInput, HealthReason, HealthResult, ProjectHealth } from "../types";

const DAY = 86400000;

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / DAY);
}

function dateOnly(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function computeHealth(input: HealthInput): HealthResult {
  const { project, milestones, tasks, financials, progress, thresholds } = input;
  const today = new Date(Date.UTC(input.today.getUTCFullYear(), input.today.getUTCMonth(), input.today.getUTCDate()));
  const reasons: HealthReason[] = [];
  const closed = CLOSED_STATUSES.includes(project.status);
  let level: 0 | 1 | 2 | 3 = 0; // healthy, attention, at_risk, critical
  const raise = (to: 1 | 2 | 3) => {
    if (to > level) level = to;
  };

  // Deadlines only matter while the project is open.
  if (!closed && project.deadline) {
    const overdue = daysBetween(dateOnly(project.deadline), today);
    if (overdue > 0) {
      reasons.push({ code: "overdue_project", params: { days: overdue } });
      raise(overdue >= HEALTH_RULES.PROJECT_OVERDUE_CRITICAL_DAYS ? 3 : 2);
    } else if (-overdue <= HEALTH_RULES.DEADLINE_SOON_DAYS && progress.percent < HEALTH_RULES.DEADLINE_SOON_MIN_PROGRESS && progress.basis !== "none") {
      reasons.push({ code: "deadline_soon", params: { days: -overdue, percent: 100 - progress.percent } });
      raise(1);
    }
  }

  if (!closed) {
    for (const m of milestones) {
      if (m.status === "completed" || !m.dueDate) continue;
      const overdue = daysBetween(dateOnly(m.dueDate), today);
      if (overdue > 0) {
        reasons.push({ code: "overdue_milestone", params: { title: m.title, days: overdue } });
        raise(2);
      }
    }
    const blocked = tasks.filter((t) => t.status === "blocked").length;
    if (blocked > 0) {
      reasons.push({ code: "blocked_tasks", params: { n: blocked } });
      raise(blocked >= HEALTH_RULES.BLOCKED_TASKS_AT_RISK ? 2 : 1);
    }
  }

  // Margin: use the forecast (where we will land) against the Settings thresholds.
  const margin = financials.forecast.grossMargin;
  if (margin != null) {
    const pct = Math.round(margin * 10) / 10;
    if (margin < thresholds.minimum) {
      reasons.push({ code: "margin_below_minimum", params: { margin: pct } });
      raise(3);
    } else if (margin < thresholds.warning) {
      reasons.push({ code: "margin_below_warning", params: { margin: pct } });
      raise(2);
    } else if (margin < thresholds.target) {
      reasons.push({ code: "margin_below_target", params: { margin: pct } });
      raise(1);
    }
  }

  // Cost overrun: forecast direct cost vs. sold direct cost (+ approved change costs).
  const soldCost = financials.baseline.directCost + financials.approvedChanges.directCost;
  if (soldCost > 0 && financials.forecast.basis === "activity") {
    const overrun = ((financials.forecast.directCost - soldCost) / soldCost) * 100;
    if (overrun >= HEALTH_RULES.COST_OVERRUN_PERCENT) {
      reasons.push({ code: "cost_overrun", params: { percent: Math.round(overrun) } });
      raise(overrun >= HEALTH_RULES.COST_OVERRUN_CRITICAL_PERCENT ? 3 : 2);
    }
  }

  const status: ProjectHealth = (["healthy", "attention", "at_risk", "critical"] as const)[level];
  return { status, reasons };
}
