import "server-only";

import { CRM_STAGES, PIPELINE_LIST_LIMIT } from "@/modules/sales/constants";
import { pipelineStats, rowToDetails, sortDeals, toDeal } from "@/modules/sales/services/pipeline";
import type { CrmStage } from "@/modules/sales/types";
import { rowToCompany } from "@/modules/sourcing/queries/mappers";
import type { CompanyCrmDetailsRow, CompanyLeadRow } from "@/types/database";

import { hermesClient } from "../client";
import { clampLimit, money } from "./shared";

type JoinedRow = CompanyLeadRow & { company_crm_details: CompanyCrmDetailsRow | CompanyCrmDetailsRow[] | null };

/**
 * Sales pipeline. Counts and values come from the Sales module's own
 * `pipelineStats`, which keeps every currency separate — an open pipeline of
 * 850 000 CZK and 14 000 EUR is two numbers, never one.
 */
export async function salesPipeline(input: { stage?: string; includeClosed?: boolean; limit?: number }) {
  const supabase = hermesClient();
  const { data, error } = await supabase
    .from("company_leads")
    .select("*, company_crm_details(*)")
    .not("crm_status", "is", null)
    .order("crm_added_at", { ascending: false, nullsFirst: false })
    .limit(PIPELINE_LIST_LIMIT)
    .returns<JoinedRow[]>();
  if (error) throw new Error(`sales read failed: ${error.message}`);

  const now = new Date();
  const deals = (data ?? []).map((row) => {
    const d = Array.isArray(row.company_crm_details) ? row.company_crm_details[0] ?? null : row.company_crm_details;
    // Owner and estimate names are looked up by the app for display only; the
    // endpoint leaves them out rather than exposing people.
    return toDeal(rowToCompany(row), d ? rowToDetails(d) : null, {}, now);
  });

  const stats = pipelineStats(deals, now);
  const limit = clampLimit(input.limit);
  const visible = sortDeals(
    deals.filter((d) => (input.includeClosed ? true : d.isOpen) && (input.stage ? d.stage === input.stage : true)),
    "value"
  ).slice(0, limit);

  const perCurrency = (values: Partial<Record<string, number>>) =>
    Object.entries(values).map(([currency, amount]) => money(amount ?? 0, currency));

  return {
    note: "Pipeline value is not cash and not revenue — a deal only becomes money when it turns into a project and the client pays. Values are listed per currency and never added together.",
    openDeals: stats.openDeals,
    openValue: perCurrency(stats.openValue),
    weightedValue: perCurrency(stats.weightedValue),
    overdueNextActions: stats.overdueActions,
    wonThisMonth: stats.wonThisMonth,
    lostThisMonth: stats.lostThisMonth,
    byStage: CRM_STAGES.map((stage) => ({ stage, deals: stats.byStage[stage as CrmStage] ?? 0 })),
    deals: visible.map((d) => ({
      companyId: d.company.id,
      company: d.company.name,
      stage: d.stage,
      value: d.details.dealValue == null || !d.details.dealCurrency ? null : money(d.details.dealValue, d.details.dealCurrency),
      probability: d.probability,
      weightedValue: d.weightedValue == null || !d.details.dealCurrency ? null : money(d.weightedValue, d.details.dealCurrency),
      expectedClose: d.details.expectedClose,
      nextStep: d.details.nextStep,
      nextActionAt: d.details.nextActionAt,
      nextActionOverdue: d.nextActionOverdue,
      ageDays: d.ageDays,
    })),
  };
}
