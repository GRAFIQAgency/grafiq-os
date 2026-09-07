import { PageHeader } from "@/components/shared/page-header";
import { moduleMetadata } from "@/lib/i18n/metadata";
import { getDictionary } from "@/lib/i18n/server";
import { BusinessSettingsForm } from "@/modules/settings/components/business-settings-form";
import { RoleCostsTable } from "@/modules/settings/components/role-costs-table";
import { listRoleCosts, loadBusinessSettings } from "@/modules/settings/queries";
import { PeopleRatesTable } from "@/modules/talent/components/people-rates-table";
import { listActiveTalent } from "@/modules/talent/queries";

export const generateMetadata = moduleMetadata("settings");

export default async function SettingsPage() {
  const [dict, { settings, persisted }, roles, people] = await Promise.all([
    getDictionary(),
    loadBusinessSettings(),
    listRoleCosts(),
    listActiveTalent(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title={dict.modules.settings.title} description={dict.modules.settings.description} />

      <section className="space-y-6" aria-labelledby="business-settings">
        <div className="space-y-1">
          <h2 id="business-settings" className="text-lg font-semibold tracking-tight">
            {dict.settings.business.title}
          </h2>
          <p className="text-sm text-muted-foreground">{dict.settings.business.description}</p>
        </div>

        <BusinessSettingsForm key={persisted ? "db" : "defaults"} initial={settings} persisted={persisted} />
        <RoleCostsTable key={roles.map((r) => r.id).join(",")} roles={roles} defaultCurrency={settings.defaultCurrency} />
        <PeopleRatesTable
          key={people.map((p) => `${p.id}:${p.hourlyCost}:${p.role}`).join(",")}
          people={people}
          roleNames={roles.filter((r) => r.isActive).map((r) => r.name)}
          defaultCurrency={settings.defaultCurrency}
        />
      </section>
    </div>
  );
}
