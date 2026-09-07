import type { CrmStatus, Currency } from "@/types/database";
import type { CompanyContact, CompanyLead } from "@/modules/sourcing/types";

/** Pipeline stage = `company_leads.crm_status` on the shared company record. */
export type CrmStage = CrmStatus;

/** Deal fields stored 1:1 with the shared company record (`company_crm_details`). */
export interface DealDetails {
  companyId: string;
  ownerId: string | null;
  dealValue: number | null;
  dealCurrency: Currency | null;
  /** Explicit probability; null = default of the stage. */
  probability: number | null;
  expectedClose: string | null;
  nextStep: string | null;
  nextActionAt: string | null;
  lostReason: string | null;
  pricingEstimateId: string | null;
  wonAt: string | null;
  lostAt: string | null;
  updatedAt: string | null;
}

/**
 * A deal = the shared company (from Sourcing) + deal details + derived values
 * (effective probability, weighted value, overdue next action, names).
 */
export interface Deal {
  company: CompanyLead;
  details: DealDetails;
  stage: CrmStage;
  ownerName: string | null;
  estimateName: string | null;
  /** Stage default unless overridden on the deal. */
  probability: number;
  probabilityIsCustom: boolean;
  /** dealValue × probability. Null when no value is set. */
  weightedValue: number | null;
  nextActionOverdue: boolean;
  isOpen: boolean;
  /** Days since the deal entered CRM (for "stale" hints). */
  ageDays: number;
}

export interface DealFilters {
  q?: string;
  stage?: CrmStage;
  ownerId?: string;
  overdueOnly?: boolean;
  /** Show closed deals (customer / lost) too. Default: open deals only. */
  includeClosed?: boolean;
  country?: string;
  industry?: string;
}

export type DealSort = "next_action" | "value" | "weighted" | "expected_close" | "score" | "name" | "recent";

export type PipelineView = "list" | "board";

export interface DealDetailsInput {
  ownerId: string | null;
  dealValue: number | null;
  dealCurrency: Currency | null;
  probability: number | null;
  expectedClose: string | null;
  nextStep: string | null;
  nextActionAt: string | null;
  pricingEstimateId: string | null;
}

export interface ContactInput {
  name: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  profileUrl: string | null;
}

export interface PipelineStats {
  openDeals: number;
  /** Sum of deal values of open deals, per currency. */
  openValue: Partial<Record<Currency, number>>;
  weightedValue: Partial<Record<Currency, number>>;
  overdueActions: number;
  wonThisMonth: number;
  lostThisMonth: number;
  byStage: Record<CrmStage, number>;
}

export interface SalesPickers {
  owners: { id: string; label: string; hint?: string }[];
  estimates: { id: string; label: string; hint?: string }[];
}

/** Project summary shown on a deal (read from the Projects module). */
export interface DealProject {
  id: string;
  name: string;
  status: string;
  deadline: string | null;
  revenue: number;
  currency: Currency;
}

/** Compact shape for Dashboard / Finance / Projects. */
export interface CustomerRecord {
  id: string;
  name: string;
  domain: string | null;
  country: string | null;
  industry: string | null;
  stage: CrmStage;
  ownerId: string | null;
  dealValue: number | null;
  dealCurrency: Currency | null;
  wonAt: string | null;
}

export type { CompanyContact };

export interface ActionResult {
  error?: string;
  fieldErrors?: Record<string, string>;
}
