import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n/server";
import { isoToday } from "@/modules/finance/calculations/dates";
import { ProjectFinanceView } from "@/modules/finance/components/project-finance";
import { getFinancePickers, getProjectFinance } from "@/modules/finance/queries";

export async function generateMetadata({ params }: PageProps<"/finance/projects/[id]">) {
  const { id } = await params;
  const [data, dict] = await Promise.all([getProjectFinance(id), getDictionary()]);
  return { title: data ? `${dict.finance.title} · ${data.detail.project.name}` : dict.finance.title };
}

export default async function ProjectFinancePage({ params }: PageProps<"/finance/projects/[id]">) {
  const { id } = await params;
  const [data, pickers] = await Promise.all([getProjectFinance(id), getFinancePickers()]);
  if (!data) notFound();
  return <ProjectFinanceView data={data} pickers={pickers} today={isoToday()} />;
}
