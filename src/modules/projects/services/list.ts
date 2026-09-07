/** Pure list filtering/sorting for computed project rows (tested). */
import { CLOSED_STATUSES, PRIORITY_RANK } from "../constants";
import type { ProjectFilters, ProjectListItem, ProjectSort } from "../types";

const lc = (s: string | null | undefined) => (s ?? "").toLowerCase();

export function matchesProjectFilters(item: ProjectListItem, f: ProjectFilters): boolean {
  const p = item.project;
  if (!f.includeArchived && !f.status && p.status === "archived") return false;
  if (f.q && !f.q.toLowerCase().split(/\s+/).every((w) => [p.name, p.clientName, p.projectType, p.ownerName].map(lc).join(" ").includes(w))) return false;
  if (f.status && p.status !== f.status) return false;
  if (f.clientId && p.clientId !== f.clientId) return false;
  if (f.ownerId && p.ownerId !== f.ownerId) return false;
  if (f.projectType && p.projectType !== f.projectType) return false;
  if (f.priority && p.priority !== f.priority) return false;
  if (f.health && item.health.status !== f.health) return false;
  if (f.deadlineBefore && (!p.deadline || p.deadline > f.deadlineBefore)) return false;
  return true;
}

export function sortProjects(items: ProjectListItem[], sort: ProjectSort): ProjectListItem[] {
  const open = (i: ProjectListItem) => (CLOSED_STATUSES.includes(i.project.status) ? 1 : 0);
  const sorters: Record<ProjectSort, (a: ProjectListItem, b: ProjectListItem) => number> = {
    deadline: (a, b) => open(a) - open(b) || (a.project.deadline ?? "9999").localeCompare(b.project.deadline ?? "9999"),
    newest: (a, b) => b.project.createdAt.localeCompare(a.project.createdAt),
    revenue: (a, b) => b.financials.current.revenue - a.financials.current.revenue,
    margin: (a, b) => (a.financials.forecast.grossMargin ?? -1) - (b.financials.forecast.grossMargin ?? -1),
    priority: (a, b) => PRIORITY_RANK[a.project.priority] - PRIORITY_RANK[b.project.priority] || (a.project.deadline ?? "9999").localeCompare(b.project.deadline ?? "9999"),
    name: (a, b) => a.project.name.localeCompare(b.project.name),
  };
  return [...items].sort(sorters[sort]);
}
