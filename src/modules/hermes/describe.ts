import "server-only";

import { isoToday } from "@/modules/finance/calculations/dates";
import { toReceivableView } from "@/modules/finance/calculations/status";
import { rowToReceivable } from "@/modules/finance/mappers";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { FinanceCashEventRow, FinanceReceivableRow, PendingActionRow, PendingActionType } from "@/types/database";

/**
 * Renders a proposal as "current → proposed" against the LIVE record.
 *
 * Both the MCP response and the approval screen use this, so what Hermes was
 * told it is proposing and what Alex sees before clicking Approve are the same
 * comparison — read fresh, because the record may have moved in between.
 *
 * The caller passes the client: the endpoint reads with the service role, the
 * approval screen reads as the signed-in user (RLS applies).
 */

export interface ActionChange {
  /** Field key; the UI translates it (dict.approvals.fields.<field>). */
  field: string;
  current: string | null;
  proposed: string;
}

export interface ActionDescription {
  actionType: PendingActionType;
  targetLabel: string;
  targetHref: string | null;
  changes: ActionChange[];
  /** One-line English summary for the API response and the audit trail. */
  summary: string;
  /** True when the target record no longer exists. */
  missing: boolean;
}

type Input = Pick<PendingActionRow, "action_type" | "target_id" | "payload">;

const str = (payload: Record<string, unknown>, key: string): string =>
  payload[key] == null ? "" : String(payload[key]);

export async function describeAction(supabase: SupabaseClient, action: Input): Promise<ActionDescription> {
  const p = action.payload ?? {};
  const missing = (label: string): ActionDescription => ({
    actionType: action.action_type, targetLabel: label, targetHref: null, changes: [], summary: `${label} no longer exists`, missing: true,
  });

  switch (action.action_type) {
    case "project_status_set": {
      const { data } = await supabase.from("projects").select("name, status").eq("id", action.target_id).maybeSingle<{ name: string; status: string }>();
      if (!data) return missing("Project");
      const proposed = str(p, "status");
      return {
        actionType: action.action_type, targetLabel: data.name, targetHref: `/projects/${action.target_id}`,
        changes: [{ field: "status", current: data.status, proposed }],
        summary: `Project "${data.name}": status ${data.status} → ${proposed}`, missing: false,
      };
    }
    case "deal_stage_set": {
      const { data } = await supabase.from("company_leads").select("name, crm_status").eq("id", action.target_id).maybeSingle<{ name: string; crm_status: string | null }>();
      if (!data) return missing("Deal");
      const proposed = str(p, "stage");
      const changes: ActionChange[] = [{ field: "stage", current: data.crm_status, proposed }];
      if (p.lostReason) changes.push({ field: "lostReason", current: null, proposed: str(p, "lostReason") });
      return {
        actionType: action.action_type, targetLabel: data.name, targetHref: `/sales/${action.target_id}`,
        changes, summary: `Deal "${data.name}": stage ${data.crm_status ?? "—"} → ${proposed}`, missing: false,
      };
    }
    case "receivable_mark_paid": {
      const { data } = await supabase.from("finance_receivables").select("*").eq("id", action.target_id).maybeSingle<FinanceReceivableRow>();
      if (!data) return missing("Receivable");
      const { data: events } = await supabase.from("finance_cash_events").select("*").eq("receivable_id", action.target_id).returns<FinanceCashEventRow[]>();
      const view = toReceivableView(
        rowToReceivable(data),
        (events ?? []).map((e) => ({ amount: Number(e.amount), voidedAt: e.voided_at })),
        isoToday()
      );
      const amount = p.amount == null ? view.outstanding : Number(p.amount);
      const label = [data.client_name, data.label].filter(Boolean).join(" · ") || data.label;
      return {
        actionType: action.action_type, targetLabel: label, targetHref: "/finance/receivables",
        changes: [
          { field: "outstanding", current: `${view.outstanding} ${data.currency}`, proposed: `${Math.max(0, view.outstanding - amount)} ${data.currency}` },
          { field: "payment", current: null, proposed: `${amount} ${data.currency}` },
          { field: "occurredAt", current: null, proposed: str(p, "occurredAt") || isoToday() },
        ],
        summary: `Receivable "${label}": record a payment of ${amount} ${data.currency} (outstanding ${view.outstanding} ${data.currency})`,
        missing: false,
      };
    }
    case "task_create": {
      const { data } = await supabase.from("projects").select("name").eq("id", action.target_id).maybeSingle<{ name: string }>();
      if (!data) return missing("Project");
      const title = str(p, "title");
      const changes: ActionChange[] = [{ field: "title", current: null, proposed: title }];
      if (p.dueDate) changes.push({ field: "dueDate", current: null, proposed: str(p, "dueDate") });
      if (p.estimatedHours != null) changes.push({ field: "estimatedHours", current: null, proposed: str(p, "estimatedHours") });
      return {
        actionType: action.action_type, targetLabel: data.name, targetHref: `/projects/${action.target_id}?tab=work`,
        changes, summary: `Project "${data.name}": create task "${title}"`, missing: false,
      };
    }
    case "client_note_add": {
      const { data } = await supabase.from("company_leads").select("name").eq("id", action.target_id).maybeSingle<{ name: string }>();
      if (!data) return missing("Company");
      const body = str(p, "body");
      return {
        actionType: action.action_type, targetLabel: data.name, targetHref: `/sourcing/companies/${action.target_id}`,
        changes: [{ field: "note", current: null, proposed: body }],
        summary: `Company "${data.name}": add internal note`, missing: false,
      };
    }
  }
}
