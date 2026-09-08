import type { ReactNode } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { getDictionary } from "@/lib/i18n/server";
import { FinanceTabs } from "@/modules/finance/components/finance-tabs";

export default async function FinanceLayout({ children }: { children: ReactNode }) {
  const dict = await getDictionary();
  return (
    <div className="space-y-6">
      <PageHeader title={dict.finance.title} description={dict.finance.description} />
      <FinanceTabs />
      {children}
    </div>
  );
}
