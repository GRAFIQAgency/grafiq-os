import { getModule, type ModuleId } from "@/config/modules";
import { interpolate } from "@/lib/i18n/interpolate";
import { getDictionary } from "@/lib/i18n/server";

import { PageHeader } from "./page-header";
import { PlaceholderBadge } from "./placeholder-badge";

interface ModulePlaceholderProps {
  moduleId: ModuleId;
}

/**
 * Standard page for modules that are registered but not built yet.
 * Replace the page's contents with real module components when ready.
 */
export async function ModulePlaceholder({ moduleId }: ModulePlaceholderProps) {
  const mod = getModule(moduleId);
  const dict = await getDictionary();
  const text = dict.modules[moduleId];
  const Icon = mod.icon;

  return (
    <div className="space-y-8">
      <PageHeader
        title={text.title}
        description={text.description}
        actions={<PlaceholderBadge label={dict.common.plannedModule} />}
      />

      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-dashed bg-card/40 px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-base font-medium">
          {interpolate(dict.placeholder.notBuilt, { title: text.title })}
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {dict.placeholder.reserved}{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">src/modules/{mod.id}</code>.{" "}
          {dict.placeholder.later}
        </p>
      </div>
    </div>
  );
}
