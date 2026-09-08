import Link from "next/link";

import { getModule } from "@/config/modules";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

import type { ProjectQaSummary } from "../types";

/** Small QA signal in the project header; links to the QA tab. Nothing when the project has no checklist. */
export function ProjectQaSignal({ summary, dict, locale }: { summary: ProjectQaSummary; dict: Dictionary; locale: Locale }) {
  void locale;
  if (!summary.checklists) return null;
  const t = dict.qa.project.signal;
  const issues = summary.failed + summary.blocked;
  const text = issues ? interpolate(t.needsFixes, { n: issues }) : summary.overdue ? t.overdue : summary.blocksCompletion ? t.pending : t.approved;
  const tone = issues || summary.overdue ? "border-red-500/30 bg-red-500/10 text-red-400" : summary.blocksCompletion ? "border-violet-500/30 bg-violet-500/10 text-violet-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  return (
    <Link href={`${getModule("projects").href}/${summary.projectId}?tab=qa`} className={cn("inline-flex h-5 items-center rounded-full border px-2 text-xs font-medium whitespace-nowrap hover:opacity-80", tone)} data-guide="qa-signal">
      {text}
    </Link>
  );
}
