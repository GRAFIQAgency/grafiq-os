import { moduleMetadata } from "@/lib/i18n/metadata";
import { getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { CsvImportForm } from "@/modules/sourcing/components/sources/csv-import-form";
import { SourcesTable } from "@/modules/sourcing/components/sources/sources-table";
import { listSources } from "@/modules/sourcing/queries/sources";

export const generateMetadata = moduleMetadata("sourcing");

export default async function SourcesPage() {
  const [dict, sources, supabase] = await Promise.all([getDictionary(), listSources(), createClient()]);
  const { data } = await supabase.from("sourcing_sources").select("id").returns<{ id: string }[]>();
  const registered = (data ?? []).map((r) => r.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{dict.sourcing.sources.title}</h2>
        <p className="text-sm text-muted-foreground">{dict.sourcing.sources.description}</p>
        <p className="mt-1 text-xs text-muted-foreground">{dict.sourcing.sources.compliance}</p>
      </div>
      <SourcesTable sources={sources} registered={registered} />
      <CsvImportForm />
    </div>
  );
}
