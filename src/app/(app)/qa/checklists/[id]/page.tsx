import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n/server";
import { ChecklistDetail } from "@/modules/qa/components/checklist-detail";
import { getChecklistDetail, listReviewers } from "@/modules/qa/queries";

export async function generateMetadata({ params }: PageProps<"/qa/checklists/[id]">) {
  const { id } = await params;
  const [detail, dict] = await Promise.all([getChecklistDetail(id), getDictionary()]);
  return { title: detail ? `${dict.qa.title} · ${detail.project.name}` : dict.qa.title };
}

export default async function QaChecklistPage({ params }: PageProps<"/qa/checklists/[id]">) {
  const { id } = await params;
  const [detail, reviewers] = await Promise.all([getChecklistDetail(id), listReviewers()]);
  if (!detail) notFound();
  return <ChecklistDetail detail={detail} reviewers={reviewers} />;
}
