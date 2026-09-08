import type {
  ChangeRequestStatus, Currency, DirectCostCategory, MilestoneStatus, PricingCostItemKind, PricingModel, ProjectLinkKind,
  ProjectMemberStatus, ProjectPriority, ProjectStatus, RateSource, TaskStatus,
} from "@/types/database";
import type { MarginThresholds } from "@/modules/settings/types";
import type { ActivityEntry, InternalNote } from "@/modules/sourcing/types";

export type {
  ChangeRequestStatus, DirectCostCategory, MilestoneStatus, PricingModel, ProjectLinkKind, ProjectMemberStatus,
  ProjectPriority, ProjectStatus, RateSource, TaskStatus,
};

export interface Project {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  clientId: string | null;
  clientName: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  projectType: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  ownerId: string | null;
  ownerName: string | null;
  startDate: string | null;
  deadline: string | null;
  currency: Currency;
  /** Baseline: what was sold. Frozen at creation. */
  baselineRevenue: number;
  baselineDirectCost: number;
  baselineTargetMargin: number;
  baselineCreatedAt: string;
  /** Per-unit projects: what was sold as count × unit price (informational). */
  baselineUnitCount: number | null;
  baselineUnitPrice: number | null;
  unitLabel: string | null;
  pricingEstimateId: string | null;
  manualProgress: number | null;
  notes: string | null;
  completedAt: string | null;
}

export interface BaselineCostLine {
  id: string;
  name: string;
  kind: PricingCostItemKind;
  hours: number;
  hourlyRate: number;
  fixedAmount: number;
  percent: number;
  quantity: number;
  unitCost: number;
  unitLabel: string | null;
  total: number;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  talentCandidateId: string | null;
  userId: string | null;
  displayName: string;
  projectRole: string;
  status: ProjectMemberStatus;
  plannedHours: number | null;
  startsOn: string | null;
  endsOn: string | null;
  /** Snapshot taken at assignment; never re-read from Talent/Settings. */
  costRate: number | null;
  currency: Currency | null;
  rateSource: RateSource;
  notes: string | null;
  /** How this person is paid ON THIS PROJECT (may differ from their Talent default). */
  payModel: PricingModel;
  /** Agreed fixed cost for the whole project (payModel = fixed). */
  fixedCost: number | null;
  /** Share of the project revenue in percent (payModel = percent). */
  percent: number | null;
  /** payModel = unit: cost per delivered unit, planned and delivered units. */
  unitCost: number | null;
  plannedUnits: number | null;
  deliveredUnits: number;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  ownerMemberId: string | null;
  status: MilestoneStatus;
  position: number;
  notes: string | null;
  completedAt: string | null;
}

export interface Task {
  id: string;
  projectId: string;
  milestoneId: string | null;
  title: string;
  description: string | null;
  assigneeMemberId: string | null;
  status: TaskStatus;
  priority: ProjectPriority;
  estimatedHours: number | null;
  actualHours: number | null;
  startDate: string | null;
  dueDate: string | null;
  blockedReason: string | null;
  notes: string | null;
  position: number;
  completedAt: string | null;
}

export interface ProjectLink {
  id: string;
  label: string;
  url: string;
  kind: ProjectLinkKind;
}

export interface DirectCost {
  id: string;
  label: string;
  category: DirectCostCategory;
  estimatedCost: number;
  actualCost: number | null;
  currency: Currency;
  note: string | null;
}

export interface ChangeRequest {
  id: string;
  title: string;
  description: string | null;
  status: ChangeRequestStatus;
  additionalRevenue: number;
  additionalDirectCost: number;
  deadlineImpactDays: number | null;
  notes: string | null;
  approvedAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Calculated views
// ---------------------------------------------------------------------------

export interface MoneyBlock {
  revenue: number;
  directCost: number;
  grossProfit: number;
  /** Percent, null when revenue is 0. */
  grossMargin: number | null;
}

export interface ProjectFinancials {
  currency: Currency;
  baseline: MoneyBlock;
  approvedChanges: { count: number; revenue: number; directCost: number };
  current: MoneyBlock & {
    actualLabourCost: number;
    actualFixedCost: number;
    estimatedHours: number;
    actualHours: number;
    /** Hours logged on tasks whose assignee has no cost rate (not counted in labour). */
    unpricedHours: number;
  };
  forecast: MoneyBlock & {
    labourCost: number;
    fixedCost: number;
    /** "baseline" when there is no team/task/cost activity yet to forecast from. */
    basis: "activity" | "baseline";
  };
}

export type ProgressBasis = "tasks_hours" | "tasks_count" | "milestones" | "manual" | "none";

export interface ProgressResult {
  percent: number;
  basis: ProgressBasis;
  done: number;
  total: number;
}

export type ProjectHealth = "healthy" | "attention" | "at_risk" | "critical";

export type HealthReasonCode =
  | "overdue_project" | "overdue_milestone" | "blocked_tasks" | "margin_below_minimum"
  | "margin_below_warning" | "margin_below_target" | "cost_overrun" | "deadline_soon";

export interface HealthReason {
  code: HealthReasonCode;
  params: Record<string, string | number>;
}

export interface HealthResult {
  status: ProjectHealth;
  reasons: HealthReason[];
}

export interface HealthInput {
  project: Pick<Project, "status" | "deadline">;
  milestones: Pick<Milestone, "title" | "dueDate" | "status">[];
  tasks: Pick<Task, "status">[];
  financials: ProjectFinancials;
  progress: ProgressResult;
  thresholds: MarginThresholds;
  today: Date;
}

export interface ProjectListItem {
  project: Project;
  financials: ProjectFinancials;
  progress: ProgressResult;
  health: HealthResult;
  memberCount: number;
  openTasks: number;
  blockedTasks: number;
}

export interface ProjectDetail {
  project: Project;
  members: ProjectMember[];
  milestones: Milestone[];
  tasks: Task[];
  links: ProjectLink[];
  costs: DirectCost[];
  changeRequests: ChangeRequest[];
  baselineCosts: BaselineCostLine[];
  notes: InternalNote[];
  activity: ActivityEntry[];
  financials: ProjectFinancials;
  progress: ProgressResult;
  health: HealthResult;
}

export interface ProjectFilters {
  q?: string;
  status?: ProjectStatus;
  clientId?: string;
  ownerId?: string;
  projectType?: string;
  priority?: ProjectPriority;
  health?: ProjectHealth;
  deadlineBefore?: string;
  includeArchived?: boolean;
}

export type ProjectSort = "deadline" | "newest" | "revenue" | "margin" | "priority" | "name";

/** Options for pickers (client, owner, estimate, person). */
export interface PickerOption {
  id: string;
  label: string;
  hint?: string;
}

export interface PersonOption extends PickerOption {
  kind: "talent" | "user";
  role: string | null;
  hourlyCost: number | null;
  currency: Currency | null;
  costIsPersonSpecific: boolean;
  /** Talent default pay model + values (null for internal users). */
  pricingModel: PricingModel | null;
  fixedPrice: number | null;
  marginPercent: number | null;
  unitPrice: number | null;
  unitLabel: string | null;
}

export interface RateSuggestion {
  rate: number | null;
  currency: Currency | null;
  source: RateSource;
}

/** Suggested pay model for a new assignment: the person's Talent default. */
export interface PayModelSuggestion {
  payModel: PricingModel;
  fixedCost: number | null;
  percent: number | null;
  unitCost: number | null;
  unitLabel: string | null;
}

export interface ActionResult {
  error?: string;
  fieldErrors?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Read API shapes for future modules
// ---------------------------------------------------------------------------

export interface ProjectStats {
  activeProjects: number;
  atRiskProjects: number;
  upcomingDeadlines: { id: string; name: string; deadline: string; health: ProjectHealth }[];
  totalRevenue: number;
  averageMargin: number | null;
}

/** One task of an assignment, as Capacity needs it (hours + dates only). */
export interface AssignmentTask {
  id: string;
  title: string;
  status: TaskStatus;
  estimatedHours: number | null;
  startDate: string | null;
  dueDate: string | null;
}

export interface ProjectAssignment {
  projectId: string;
  projectName: string;
  projectStatus: ProjectStatus;
  projectStartDate: string | null;
  projectDeadline: string | null;
  memberId: string;
  talentCandidateId: string | null;
  userId: string | null;
  displayName: string;
  projectRole: string;
  memberStatus: ProjectMemberStatus;
  plannedHours: number | null;
  startsOn: string | null;
  endsOn: string | null;
  taskEstimatedHours: number;
  taskActualHours: number;
  /** Tasks assigned to this member (Capacity places their hours by task dates). */
  tasks: AssignmentTask[];
}
