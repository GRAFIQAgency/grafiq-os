import { AlertTriangle } from "lucide-react";

import type { Dictionary } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";

import type { CapacityWarning } from "../types";

export function WarningsList({ warnings, dict }: { warnings: CapacityWarning[]; dict: Dictionary }) {
  const t = dict.capacity.warnings;
  if (!warnings.length) return <p className="text-sm text-muted-foreground">{t.none}</p>;
  return (
    <ul className="space-y-1.5 text-sm">
      {warnings.map((w, i) => (
        <li key={`${w.code}-${w.projectId ?? ""}-${i}`} className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
          <span>{interpolate(t[w.code], { project: w.projectName ?? "", ...Object.fromEntries(Object.entries(w.params).map(([k, v]) => [k, String(v)])) })}</span>
        </li>
      ))}
    </ul>
  );
}
