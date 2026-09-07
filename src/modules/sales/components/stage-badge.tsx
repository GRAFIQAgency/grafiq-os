import { StatusBadge } from "@/components/shared/status-badge";
import type { Dictionary } from "@/lib/i18n/config";

import type { CrmStage } from "../types";

/** Visual tone per pipeline stage (reuses the shared status-badge palette). */
export const STAGE_TONE: Record<CrmStage, string> = {
  prospect: "discovered",
  contacted: "reviewed",
  qualified: "shortlisted",
  proposal: "interview",
  negotiation: "trial",
  customer: "approved",
  lost: "rejected",
};

export function StageBadge({ stage, dict, className }: { stage: CrmStage; dict: Dictionary; className?: string }) {
  return <StatusBadge status={STAGE_TONE[stage]} label={dict.sales.stages[stage]} className={className} />;
}
