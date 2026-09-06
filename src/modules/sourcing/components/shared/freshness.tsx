import type { Dictionary } from "@/lib/i18n/config";
import { INTL_LOCALES, type Locale } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";

import { isStale } from "../../services/freshness";

export function Freshness({ lastCheckedAt, firstDiscoveredAt, dict, locale }: { lastCheckedAt: string; firstDiscoveredAt: string; dict: Dictionary; locale: Locale }) {
  const fmt = new Intl.DateTimeFormat(INTL_LOCALES[locale], { dateStyle: "medium" });
  const stale = isStale(lastCheckedAt);
  return (
    <p className={stale ? "text-xs text-amber-400" : "text-xs text-muted-foreground"}>
      {interpolate(stale ? dict.sourcing.common.stale : dict.sourcing.common.fresh, { date: fmt.format(new Date(lastCheckedAt)) })}
      {" · "}
      {interpolate(dict.sourcing.common.discovered, { date: fmt.format(new Date(firstDiscoveredAt)) })}
    </p>
  );
}
