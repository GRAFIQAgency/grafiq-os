import { PageHeader } from "@/components/shared/page-header";
import { moduleMetadata } from "@/lib/i18n/metadata";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { DashboardView } from "@/modules/dashboard/components/dashboard-view";
import { getDashboardData } from "@/modules/dashboard/queries";
import { WelcomeBanner } from "@/modules/guide/components/welcome-banner";

export const generateMetadata = moduleMetadata("dashboard");

export default async function DashboardPage() {
  const [dict, locale, data] = await Promise.all([getDictionary(), getLocale(), getDashboardData()]);

  return (
    <div className="space-y-6">
      <PageHeader title={dict.modules.dashboard.title} description={dict.dashboard.intro} />
      <WelcomeBanner />
      <DashboardView data={data} dict={dict} locale={locale} />
    </div>
  );
}
