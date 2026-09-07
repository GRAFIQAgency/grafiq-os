import type {
  ProjectBaselineCostRow, ProjectChangeRequestRow, ProjectDirectCostRow, ProjectLinkRow, ProjectMemberRow,
  ProjectMilestoneRow, ProjectRow, ProjectTaskRow,
} from "@/types/database";

import type { BaselineCostLine, ChangeRequest, DirectCost, Milestone, Project, ProjectLink, ProjectMember, Task } from "./types";

const num = (v: number | string | null) => (v == null ? null : Number(v));

export function rowToProject(r: ProjectRow, clientName: string | null, ownerName: string | null): Project {
  return {
    id: r.id, createdAt: r.created_at, updatedAt: r.updated_at, name: r.name, clientId: r.client_id, clientName,
    contactName: r.contact_name, contactEmail: r.contact_email, contactPhone: r.contact_phone, projectType: r.project_type,
    status: r.status, priority: r.priority, ownerId: r.owner_id, ownerName, startDate: r.start_date, deadline: r.deadline,
    currency: r.currency, baselineRevenue: Number(r.baseline_revenue), baselineDirectCost: Number(r.baseline_direct_cost),
    baselineTargetMargin: Number(r.baseline_target_margin), baselineCreatedAt: r.baseline_created_at,
    pricingEstimateId: r.pricing_estimate_id, manualProgress: r.manual_progress, notes: r.notes, completedAt: r.completed_at,
  };
}

export function rowToBaselineCost(r: ProjectBaselineCostRow): BaselineCostLine {
  return { id: r.id, name: r.name, kind: r.kind, hours: Number(r.hours), hourlyRate: Number(r.hourly_rate), fixedAmount: Number(r.fixed_amount), percent: Number(r.percent ?? 0), total: Number(r.total) };
}

export function rowToMember(r: ProjectMemberRow): ProjectMember {
  return {
    id: r.id, projectId: r.project_id, talentCandidateId: r.talent_candidate_id, userId: r.user_id, displayName: r.display_name,
    projectRole: r.project_role, status: r.status, plannedHours: num(r.planned_hours), startsOn: r.starts_on, endsOn: r.ends_on,
    costRate: num(r.cost_rate), currency: r.currency, rateSource: r.rate_source, notes: r.notes,
  };
}

export function rowToMilestone(r: ProjectMilestoneRow): Milestone {
  return { id: r.id, projectId: r.project_id, title: r.title, description: r.description, dueDate: r.due_date, ownerMemberId: r.owner_member_id, status: r.status, position: r.position, notes: r.notes, completedAt: r.completed_at };
}

export function rowToTask(r: ProjectTaskRow): Task {
  return {
    id: r.id, projectId: r.project_id, milestoneId: r.milestone_id, title: r.title, description: r.description, assigneeMemberId: r.assignee_member_id,
    status: r.status, priority: r.priority, estimatedHours: num(r.estimated_hours), actualHours: num(r.actual_hours), startDate: r.start_date,
    dueDate: r.due_date, blockedReason: r.blocked_reason, notes: r.notes, position: r.position, completedAt: r.completed_at,
  };
}

export function rowToLink(r: ProjectLinkRow): ProjectLink {
  return { id: r.id, label: r.label, url: r.url, kind: r.kind };
}

export function rowToDirectCost(r: ProjectDirectCostRow): DirectCost {
  return { id: r.id, label: r.label, category: r.category, estimatedCost: Number(r.estimated_cost), actualCost: num(r.actual_cost), currency: r.currency, note: r.note };
}

export function rowToChangeRequest(r: ProjectChangeRequestRow): ChangeRequest {
  return {
    id: r.id, title: r.title, description: r.description, status: r.status, additionalRevenue: Number(r.additional_revenue),
    additionalDirectCost: Number(r.additional_direct_cost), deadlineImpactDays: r.deadline_impact_days, notes: r.notes, approvedAt: r.approved_at, createdAt: r.created_at,
  };
}
