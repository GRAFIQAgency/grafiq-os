import { moduleMetadata } from "@/lib/i18n/metadata";
import { getDictionary } from "@/lib/i18n/server";
import { SavedSearchesTable } from "@/modules/sourcing/components/searches/saved-searches-table";
import { listSavedSearches } from "@/modules/sourcing/queries/searches";

export const generateMetadata = moduleMetadata("sourcing");

export default async function SavedSearchesPage() {
  const [dict, searches] = await Promise.all([getDictionary(), listSavedSearches()]);
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{dict.sourcing.searches.title}</h2>
        <p className="text-sm text-muted-foreground">{dict.sourcing.searches.description}</p>
      </div>
      <SavedSearchesTable searches={searches} />
    </div>
  );
}
