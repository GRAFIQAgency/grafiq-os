/**
 * Hand-written database types for the current (small) schema.
 *
 * When the schema grows, replace this file with generated types:
 *   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
 * and update the Supabase client factories to use `Database`.
 */

export type UserRole = "admin" | "member";

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// --- Pricing module (supabase/migrations/0002_pricing.sql) ---

/** Currencies supported by the app (also enforced by DB check constraints). */
export type Currency = "CZK" | "EUR" | "USD";
export type PricingCurrency = Currency;
/** hourly = hours × rate, fixed = flat amount, percent = share of the client price, unit = quantity × price per unit. */
export type PricingCostItemKind = "hourly" | "fixed" | "percent" | "unit";
/** total = client price entered directly; per_unit = unit_count × unit_price. */
export type PricingBasis = "total" | "per_unit";
/** How a Talent Bench person is usually paid (Settings → People rates). */
export type PricingModel = PricingCostItemKind;

export interface PricingEstimateRow {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  project_name: string;
  client_name: string | null;
  currency: PricingCurrency;
  /** Client price excluding VAT. Postgres numeric → arrives as number via PostgREST. */
  revenue: number;
  /** Target gross margin in percent (0–99.99). */
  target_margin: number;
  pricing_basis: PricingBasis;
  unit_count: number | null;
  unit_price: number | null;
  unit_label: string | null;
}

export interface PricingCostItemRow {
  id: string;
  estimate_id: string;
  created_at: string;
  name: string;
  kind: PricingCostItemKind;
  hours: number;
  hourly_rate: number;
  fixed_amount: number;
  /** Percent of the client price (kind = percent). */
  percent: number;
  /** kind = unit: quantity × unit_cost. */
  quantity: number;
  unit_cost: number;
  unit_label: string | null;
  position: number;
}

// --- Settings module (supabase/migrations/0003_business_settings.sql) ---

export interface BusinessSettingsRow {
  /** Always 1 — single-company setup. */
  id: number;
  created_at: string;
  updated_at: string;
  company_name: string;
  default_currency: Currency;
  vat_rate: number;
  target_margin: number;
  warning_margin: number;
  minimum_margin: number;
  /** Percentages adding up to 100, e.g. [50, 30, 20]. */
  payment_terms: number[];
}

export interface RoleCostRow {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  hourly_cost: number;
  currency: Currency;
  is_active: boolean;
  position: number;
}

// --- Sourcing module (supabase/migrations/0004_sourcing.sql) ---

export type SourcingEntityType = "talent" | "company";
export type SearchRunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type TalentSeniority = "junior" | "mid" | "senior" | "lead";
export type TalentEmploymentType = "freelancer" | "contractor" | "employee";
export type TalentAvailability = "available" | "limited" | "unavailable" | "unknown";
export type TalentStatus =
  | "discovered" | "reviewed" | "shortlisted" | "contacted" | "interview"
  | "trial" | "approved" | "preferred" | "rejected" | "archived";
export type CompanyStatus =
  | "discovered" | "reviewed" | "shortlisted" | "contacted" | "qualified" | "rejected" | "archived";
/** CRM pipeline stage on the shared company record (Sales module). */
export type CrmStatus = "prospect" | "contacted" | "qualified" | "proposal" | "negotiation" | "customer" | "lost";
export type CompanySizeBucket = "1-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1000+";
export type BusinessModel = "b2b" | "b2c" | "both";
export type CompanyType =
  | "saas" | "ecommerce" | "services" | "agency" | "manufacturing" | "hospitality" | "real_estate" | "other";
export type SignalStrength = "low" | "medium" | "high";

export interface SourcingSourceRow {
  id: string;
  enabled: boolean;
  config: Record<string, unknown>;
  last_run_at: string | null;
  last_error: string | null;
  records_collected: number;
  updated_at: string;
}

export interface SourcingSearchRow {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  entity_type: SourcingEntityType;
  name: string;
  filters: Record<string, unknown>;
  last_run_at: string | null;
}

export interface SourcingSearchRunRow {
  id: string;
  created_at: string;
  created_by: string | null;
  search_id: string | null;
  entity_type: SourcingEntityType;
  filters: Record<string, unknown>;
  status: SearchRunStatus;
  started_at: string | null;
  finished_at: string | null;
  sources_total: number;
  sources_completed: number;
  results_total: number;
  results_new: number;
  results_duplicates: number;
  errors: { sourceId: string; message: string; retries: number }[];
}

export interface TalentCandidateRow {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  full_name: string;
  headline: string | null;
  role: string | null;
  email: string | null;
  profile_url: string | null;
  portfolio_url: string | null;
  avatar_url: string | null;
  country: string | null;
  city: string | null;
  remote: boolean | null;
  seniority: TalentSeniority | null;
  employment_type: TalentEmploymentType | null;
  hourly_rate_min: number | null;
  hourly_rate_max: number | null;
  rate_currency: Currency | null;
  availability: TalentAvailability | null;
  years_experience: number | null;
  agency_experience: boolean | null;
  skills: string[];
  technologies: string[];
  languages: string[];
  summary: string | null;
  status: TalentStatus;
  in_talent_bench: boolean;
  bench_added_at: string | null;
  tags: string[];
  ratings: Record<string, number>;
  ai_score: number | null;
  manual_score: number | null;
  first_discovered_at: string;
  last_checked_at: string;
  email_key: string | null;
  profile_key: string | null;
  portfolio_key: string | null;
  name_location_key: string | null;
}

export interface CompanyLeadRow {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  name: string;
  domain: string | null;
  website: string | null;
  logo_url: string | null;
  registration_id: string | null;
  industry: string | null;
  country: string | null;
  city: string | null;
  employee_count: number | null;
  size_bucket: CompanySizeBucket | null;
  revenue: number | null;
  revenue_currency: Currency | null;
  founded_year: number | null;
  description: string | null;
  technologies: string[];
  keywords: string[];
  business_model: BusinessModel | null;
  company_type: CompanyType | null;
  language: string | null;
  status: CompanyStatus;
  crm_status: CrmStatus | null;
  crm_added_at: string | null;
  tags: string[];
  lead_score: number | null;
  manual_score: number | null;
  first_discovered_at: string;
  last_checked_at: string;
  name_location_key: string | null;
}

export interface CompanyCrmDetailsRow {
  company_id: string;
  created_at: string;
  updated_at: string;
  owner_id: string | null;
  deal_value: number | null;
  deal_currency: Currency | null;
  probability: number | null;
  expected_close: string | null;
  next_step: string | null;
  next_action_at: string | null;
  lost_reason: string | null;
  pricing_estimate_id: string | null;
  won_at: string | null;
  lost_at: string | null;
}

export interface SourcingSourceRecordRow {
  id: string;
  entity_type: SourcingEntityType;
  entity_id: string;
  source_id: string;
  source_entity_id: string;
  source_url: string | null;
  run_id: string | null;
  payload: Record<string, unknown>;
  retrieved_at: string;
}

export interface CompanySignalRow {
  id: string;
  company_id: string;
  type: string;
  strength: SignalStrength;
  confidence: number;
  detected_at: string;
  source_id: string | null;
  description: string | null;
}

export interface CompanyContactRow {
  id: string;
  created_at: string;
  company_id: string;
  name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  profile_url: string | null;
  source_id: string | null;
}

export interface TalentRoleProfileRow {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  role: string;
  description: string | null;
  required_skills: string[];
  nice_to_have_skills: string[];
  min_years_experience: number | null;
  preferred_countries: string[];
  max_hourly_rate: number | null;
  rate_currency: Currency | null;
  agency_experience_preferred: boolean;
  communication_expectations: string | null;
  portfolio_required: boolean;
  is_active: boolean;
}

export interface AiEvaluationRow {
  id: string;
  created_at: string;
  entity_type: SourcingEntityType;
  entity_id: string;
  role_profile_id: string | null;
  provider: string;
  model: string | null;
  score: number;
  strengths: string[];
  weaknesses: string[];
  missing_info: string[];
  risks: string[];
  reasoning: string | null;
  factors: { factor: string; weight: number; score: number; note?: string }[];
}

export interface InternalNoteRow {
  id: string;
  created_at: string;
  entity_type: string;
  entity_id: string;
  author_id: string | null;
  author_name: string | null;
  body: string;
}

export interface ActivityLogRow {
  id: string;
  created_at: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string | null;
  actor_name: string | null;
  details: Record<string, unknown>;
}

// --- Talent Bench (supabase/migrations/0007_talent_bench.sql) ---

export type BenchStatus = "active" | "preferred" | "limited" | "unavailable" | "paused" | "archived";
export type EngagementType = "freelancer" | "contractor" | "part_time" | "employee" | "other";

export interface TalentBenchDetailsRow {
  talent_candidate_id: string;
  created_at: string;
  updated_at: string;
  bench_status: BenchStatus;
  engagement_type: EngagementType | null;
  hourly_cost: number | null;
  cost_currency: Currency | null;
  day_rate: number | null;
  minimum_engagement: string | null;
  commercial_notes: string | null;
  available_from: string | null;
  max_monthly_hours: number | null;
  preferred_monthly_hours: number | null;
  pricing_model: PricingModel;
  fixed_price: number | null;
  margin_percent: number | null;
  unit_price: number | null;
  unit_label: string | null;
}

// --- Pricing proposals (supabase/migrations/0012_member_pay_models_and_proposals.sql) ---

export type ProposalStatus = "draft" | "shared";
export type ProposalItemKind = "hourly" | "fixed" | "unit";

export interface PricingProposalItemJson {
  id: string;
  title: string;
  description: string;
  kind: ProposalItemKind;
  hours: number;
  rate: number;
  amount: number;
  /** kind = unit: quantity × unitPrice (older rows may omit them). */
  quantity?: number;
  unitPrice?: number;
  unitLabel?: string | null;
}

export interface PricingProposalRow {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  estimate_id: string | null;
  share_token: string;
  title: string;
  client_name: string | null;
  intro: string | null;
  currency: PricingCurrency;
  vat_rate: number;
  items: PricingProposalItemJson[];
  notes: string | null;
  valid_until: string | null;
  status: ProposalStatus;
  shared_at: string | null;
  generated_by: "claude" | "template" | null;
}

// --- QA module (supabase/migrations/0015_qa.sql) ---

export type QaChecklistStatus = "not_started" | "in_progress" | "needs_fixes" | "ready_for_review" | "approved";
export type QaItemStatus = "pending" | "pass" | "fail" | "na" | "blocked";

export interface QaTemplateRow {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  name: string;
  description: string | null;
  project_type: string | null;
  is_active: boolean;
  position: number;
  seed_key: string | null;
}

export interface QaTemplateItemRow {
  id: string;
  template_id: string;
  category: string;
  title: string;
  description: string | null;
  is_required: boolean;
  allow_na: boolean;
  position: number;
}

export interface QaChecklistRow {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  project_id: string;
  template_id: string | null;
  template_name: string;
  title: string;
  status: QaChecklistStatus;
  reviewer_id: string | null;
  due_date: string | null;
  required_for_completion: boolean;
  delivery_quantity: number | null;
  sample_quantity: number | null;
  sampling_note: string | null;
  started_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
}

export interface QaChecklistItemRow {
  id: string;
  created_at: string;
  updated_at: string;
  checklist_id: string;
  template_item_id: string | null;
  category: string;
  title: string;
  description: string | null;
  is_required: boolean;
  allow_na: boolean;
  position: number;
  status: QaItemStatus;
  note: string | null;
  evidence_url: string | null;
  assignee_member_id: string | null;
  fix_task_id: string | null;
  checked_at: string | null;
  checked_by: string | null;
}

// --- Capacity module (supabase/migrations/0011_capacity.sql) ---

export interface ProfileCapacityDetailsRow {
  profile_id: string;
  created_at: string;
  updated_at: string;
  monthly_capacity_hours: number;
  preferred_monthly_hours: number | null;
  capacity_active: boolean;
  notes: string | null;
}

// --- Projects module (supabase/migrations/0008_projects.sql) ---

export type ProjectStatus =
  | "draft" | "onboarding" | "active" | "waiting_client" | "internal_review"
  | "completed" | "on_hold" | "cancelled" | "archived";
export type ProjectPriority = "low" | "normal" | "high" | "critical";
export type ProjectMemberStatus = "planned" | "active" | "completed" | "removed";
export type MilestoneStatus = "not_started" | "in_progress" | "waiting" | "completed" | "blocked";
export type TaskStatus = "todo" | "in_progress" | "blocked" | "internal_review" | "done";
export type ChangeRequestStatus = "draft" | "sent" | "approved" | "rejected";
export type ProjectLinkKind = "figma" | "webflow" | "drive" | "client_docs" | "staging" | "production" | "other";
export type DirectCostCategory = "external_specialist" | "stock" | "software" | "printing" | "photography" | "subcontractor" | "other";
export type RateSource = "talent" | "role_default" | "manual";

export interface ProjectRow {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  name: string;
  client_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  project_type: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  owner_id: string | null;
  start_date: string | null;
  deadline: string | null;
  currency: Currency;
  baseline_revenue: number;
  baseline_direct_cost: number;
  baseline_target_margin: number;
  baseline_created_at: string;
  baseline_unit_count: number | null;
  baseline_unit_price: number | null;
  unit_label: string | null;
  pricing_estimate_id: string | null;
  manual_progress: number | null;
  notes: string | null;
  completed_at: string | null;
}

export interface ProjectBaselineCostRow {
  id: string;
  project_id: string;
  name: string;
  kind: PricingCostItemKind;
  hours: number;
  hourly_rate: number;
  fixed_amount: number;
  percent: number;
  quantity: number;
  unit_cost: number;
  unit_label: string | null;
  total: number;
  position: number;
}

export interface ProjectMemberRow {
  id: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  talent_candidate_id: string | null;
  user_id: string | null;
  display_name: string;
  project_role: string;
  status: ProjectMemberStatus;
  planned_hours: number | null;
  starts_on: string | null;
  ends_on: string | null;
  cost_rate: number | null;
  currency: Currency | null;
  rate_source: RateSource;
  notes: string | null;
  /** hourly = cost_rate × hours; fixed = fixed_cost; percent = percent of project revenue. */
  pay_model: PricingModel;
  fixed_cost: number | null;
  percent: number | null;
  unit_cost: number | null;
  planned_units: number | null;
  delivered_units: number;
}

export interface ProjectMilestoneRow {
  id: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  owner_member_id: string | null;
  status: MilestoneStatus;
  position: number;
  notes: string | null;
  completed_at: string | null;
}

export interface ProjectTaskRow {
  id: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  milestone_id: string | null;
  title: string;
  description: string | null;
  assignee_member_id: string | null;
  status: TaskStatus;
  priority: ProjectPriority;
  estimated_hours: number | null;
  actual_hours: number | null;
  start_date: string | null;
  due_date: string | null;
  blocked_reason: string | null;
  notes: string | null;
  position: number;
  completed_at: string | null;
}

export interface ProjectLinkRow {
  id: string;
  created_at: string;
  project_id: string;
  label: string;
  url: string;
  kind: ProjectLinkKind;
}

export interface ProjectDirectCostRow {
  id: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  label: string;
  category: DirectCostCategory;
  estimated_cost: number;
  actual_cost: number | null;
  currency: Currency;
  note: string | null;
}

export interface ProjectChangeRequestRow {
  id: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  title: string;
  description: string | null;
  status: ChangeRequestStatus;
  additional_revenue: number;
  additional_direct_cost: number;
  deadline_impact_days: number | null;
  notes: string | null;
  approved_at: string | null;
}

// --- Finance module (supabase/migrations/0016_finance.sql) ---

export type FinanceAccountType = "bank" | "cash" | "other";
export type CashDirection = "in" | "out";
/** Soft lifecycle of a receivable / payable row; the operational status is derived from cash events. */
export type FinanceItemState = "open" | "cancelled";
export type PayableCategory =
  | "freelancer" | "subcontractor" | "software" | "printing" | "photography" | "equipment"
  | "accounting" | "legal" | "office" | "marketing" | "hosting" | "insurance" | "other";
export type RecurringCostCategory =
  | "software" | "accounting" | "office" | "rent" | "phone" | "hosting" | "insurance" | "marketing" | "legal" | "other";
export type RecurringFrequency = "monthly" | "quarterly" | "yearly";

export interface FinanceAccountRow {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  name: string;
  currency: Currency;
  type: FinanceAccountType;
  current_balance: number;
  balance_as_of: string;
  is_active: boolean;
  notes: string | null;
}

export interface FinanceReceivableRow {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  project_id: string | null;
  project_name: string | null;
  client_id: string | null;
  client_name: string | null;
  label: string;
  net_amount: number;
  vat_rate: number;
  amount: number;
  currency: Currency;
  due_date: string;
  expected_date: string | null;
  percent_of_contract: number | null;
  invoice_reference: string | null;
  invoice_sent_at: string | null;
  notes: string | null;
  status: FinanceItemState;
  cancelled_at: string | null;
  position: number;
}

export interface FinancePayableRow {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  label: string;
  amount: number;
  currency: Currency;
  due_date: string;
  project_id: string | null;
  project_name: string | null;
  talent_candidate_id: string | null;
  supplier_id: string | null;
  payee_name: string | null;
  category: PayableCategory;
  notes: string | null;
  status: FinanceItemState;
  cancelled_at: string | null;
}

export interface FinanceRecurringCostRow {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  name: string;
  category: RecurringCostCategory;
  amount: number;
  currency: Currency;
  frequency: RecurringFrequency;
  next_due_date: string;
  is_active: boolean;
  notes: string | null;
}

export interface FinanceCashEventRow {
  id: string;
  created_at: string;
  created_by: string | null;
  direction: CashDirection;
  amount: number;
  currency: Currency;
  occurred_at: string;
  account_id: string | null;
  receivable_id: string | null;
  payable_id: string | null;
  recurring_cost_id: string | null;
  label: string;
  note: string | null;
  voided_at: string | null;
  void_reason: string | null;
}
