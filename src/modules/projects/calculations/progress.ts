import type { Milestone, ProgressResult, Task } from "../types";

/**
 * Progress, most reliable source first:
 * 1. task hours (done estimated hours / all estimated hours)
 * 2. task count (done / all) when tasks have no estimates
 * 3. milestones (completed / all)
 * 4. manual percentage
 * The basis is returned so the UI can say how the number was calculated.
 */
export function computeProgress(
  tasks: Pick<Task, "status" | "estimatedHours">[],
  milestones: Pick<Milestone, "status">[],
  manualProgress: number | null
): ProgressResult {
  if (tasks.length) {
    const totalHours = tasks.reduce((s, t) => s + (t.estimatedHours ?? 0), 0);
    if (totalHours > 0) {
      const doneHours = tasks.filter((t) => t.status === "done").reduce((s, t) => s + (t.estimatedHours ?? 0), 0);
      return { percent: Math.round((doneHours / totalHours) * 100), basis: "tasks_hours", done: doneHours, total: totalHours };
    }
    const done = tasks.filter((t) => t.status === "done").length;
    return { percent: Math.round((done / tasks.length) * 100), basis: "tasks_count", done, total: tasks.length };
  }
  if (milestones.length) {
    const done = milestones.filter((m) => m.status === "completed").length;
    return { percent: Math.round((done / milestones.length) * 100), basis: "milestones", done, total: milestones.length };
  }
  if (manualProgress != null) return { percent: Math.max(0, Math.min(100, manualProgress)), basis: "manual", done: 0, total: 0 };
  return { percent: 0, basis: "none", done: 0, total: 0 };
}
