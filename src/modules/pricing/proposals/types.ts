import type { PricingCurrency, PricingProposalItemJson, ProposalItemKind, ProposalStatus } from "@/types/database";

import type { CostItemInput } from "../types";

export type { ProposalItemKind, ProposalStatus };

/** One line of the client-facing pricing plan. */
export interface ProposalItem extends PricingProposalItemJson {
  kind: ProposalItemKind;
  quantity: number;
  unitPrice: number;
  unitLabel: string | null;
}

export interface Proposal {
  id: string;
  createdAt: string;
  updatedAt: string;
  estimateId: string | null;
  shareToken: string;
  title: string;
  clientName: string | null;
  intro: string | null;
  currency: PricingCurrency;
  vatRate: number;
  items: ProposalItem[];
  notes: string | null;
  validUntil: string | null;
  status: ProposalStatus;
  sharedAt: string | null;
  generatedBy: "claude" | "template" | null;
}

export interface ProposalInput {
  title: string;
  clientName: string | null;
  intro: string | null;
  currency: PricingCurrency;
  vatRate: number;
  items: ProposalItem[];
  notes: string | null;
  validUntil: string | null;
}

export interface ProposalTotals {
  subtotal: number;
  vat: number;
  total: number;
}

/** What the generator starts from: the saved estimate. */
export interface ProposalSource {
  projectName: string;
  clientName: string | null;
  currency: PricingCurrency;
  /** Client price excl. VAT — the plan should add up to this. */
  revenue: number;
  targetMargin: number;
  items: CostItemInput[];
  /** Per-unit estimates: count × unit price (the plan can show a unit line). */
  unitCount?: number | null;
  unitPrice?: number | null;
  unitLabel?: string | null;
  /** Optional free-text brief from the user. */
  brief?: string;
}

export interface GeneratedProposal {
  title: string;
  intro: string;
  items: ProposalItem[];
  notes: string | null;
}

/** Texts the template generator needs (passed in; pure code never imports dictionaries). */
export interface TemplateLabels {
  intro: string;
  notes: string;
  lineDescription: string;
  phases: { title: string; description: string; share: number }[];
}

export interface ActionResult {
  error?: string;
  fieldErrors?: Record<string, string>;
}
