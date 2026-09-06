import { PageHeader } from "@/components/shared/page-header";
import { getDictionary } from "@/lib/i18n/server";
import { SourcingTabs } from "@/modules/sourcing/components/shared/sourcing-tabs";

/** Shared header + tabs for every Sourcing route. */
export default async function SourcingLayout({ children }: LayoutProps<"/sourcing">) {
  const dict = await getDictionary();
  return (
    <div className="space-y-6">
      <PageHeader title={dict.modules.sourcing.title} description={dict.modules.sourcing.description} />
      <SourcingTabs />
      {children}
    </div>
  );
}
