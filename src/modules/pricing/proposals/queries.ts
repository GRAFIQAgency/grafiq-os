import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PricingProposalRow } from "@/types/database";

import { normalizeItem } from "./calculations";
import type { Proposal } from "./types";

export function rowToProposal(r: PricingProposalRow): Proposal {
  return {
    id: r.id, createdAt: r.created_at, updatedAt: r.updated_at, estimateId: r.estimate_id, shareToken: r.share_token, title: r.title,
    clientName: r.client_name, intro: r.intro, currency: r.currency, vatRate: Number(r.vat_rate),
    items: (Array.isArray(r.items) ? r.items : []).map((i) => normalizeItem({ ...i, kind: i.kind === "hourly" ? "hourly" : "fixed", hours: Number(i.hours) || 0, rate: Number(i.rate) || 0, amount: Number(i.amount) || 0 })),
    notes: r.notes, validUntil: r.valid_until, status: r.status, sharedAt: r.shared_at, generatedBy: r.generated_by,
  };
}

export async function getProposal(id: string): Promise<Proposal | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("pricing_proposals").select("*").eq("id", id).maybeSingle<PricingProposalRow>();
  if (error) {
    console.error("[pricing] getProposal failed:", error.message);
    return null;
  }
  return data ? rowToProposal(data) : null;
}

/** estimate id → latest proposal id (for the "Pricing plan" column and the calculator button). */
export async function proposalIdsByEstimate(estimateIds: string[]): Promise<Record<string, string>> {
  if (!estimateIds.length) return {};
  const supabase = await createClient();
  const { data, error } = await supabase.from("pricing_proposals").select("id, estimate_id, created_at").in("estimate_id", estimateIds).order("created_at", { ascending: false }).returns<Pick<PricingProposalRow, "id" | "estimate_id" | "created_at">[]>();
  if (error) {
    console.error("[pricing] proposalIdsByEstimate failed:", error.message);
    return {};
  }
  const out: Record<string, string> = {};
  for (const r of data ?? []) if (r.estimate_id && !out[r.estimate_id]) out[r.estimate_id] = r.id;
  return out;
}

/**
 * Public read for /p/<token>: no session, so it goes through the service-role
 * client and is limited to ONE row by its unguessable token. Returns null when
 * the key is not configured or the plan was never shared.
 */
export async function getSharedProposal(token: string): Promise<Proposal | null | "unavailable"> {
  if (!/^[A-Za-z0-9_-]{16,}$/.test(token)) return null;
  const admin = createAdminClient();
  if (!admin) return "unavailable";
  const { data } = await admin.from("pricing_proposals").select("*").eq("share_token", token).eq("status", "shared").maybeSingle<PricingProposalRow>();
  return data ? rowToProposal(data) : null;
}
