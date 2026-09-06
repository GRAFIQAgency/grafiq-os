import { PageHeader } from "@/components/shared/page-header";
import { moduleMetadata } from "@/lib/i18n/metadata";
import { getDictionary } from "@/lib/i18n/server";
import { GuidePage } from "@/modules/guide/components/guide-page";

export const generateMetadata = moduleMetadata("guide");

export default async function GuideRoutePage() {
  const dict = await getDictionary();
  return (
    <div className="space-y-8">
      <PageHeader title={dict.modules.guide.title} description={dict.modules.guide.description} />
      <GuidePage />
    </div>
  );
}
