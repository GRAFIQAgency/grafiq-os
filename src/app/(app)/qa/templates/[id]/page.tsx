import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n/server";
import { TemplateEditor } from "@/modules/qa/components/template-editor";
import { getTemplate } from "@/modules/qa/queries";

export async function generateMetadata({ params }: PageProps<"/qa/templates/[id]">) {
  const { id } = await params;
  const [template, dict] = await Promise.all([getTemplate(id), getDictionary()]);
  return { title: template ? `${dict.qa.templates.title} · ${template.name}` : dict.qa.templates.title };
}

export default async function QaTemplatePage({ params }: PageProps<"/qa/templates/[id]">) {
  const { id } = await params;
  const template = await getTemplate(id);
  if (!template) notFound();
  return <TemplateEditor template={template} usedByChecklists={template.usedByChecklists} />;
}
