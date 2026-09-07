import Link from "next/link";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Chips } from "@/components/shared/chips";
import { StatusBadge } from "@/components/shared/status-badge";
import { getModule } from "@/config/modules";
import type { Dictionary } from "@/lib/i18n/config";

import type { TalentPerson } from "../types";
import { RatingDots } from "./rating-dots";

const AVAILABILITY_TONE = { available: "approved", limited: "shortlisted", unavailable: "rejected", unknown: "discovered" } as const;
const BENCH_TONE = { active: "reviewed", preferred: "preferred", limited: "shortlisted", unavailable: "rejected", paused: "archived", archived: "archived" } as const;

export function TalentTable({ people, dict, filtered }: { people: TalentPerson[]; dict: Dictionary; filtered: boolean }) {
  const t = dict.talent;
  const base = getModule("talent").href;

  if (people.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center" data-guide="talent-list">
        <p className="text-sm font-medium">{filtered ? t.emptyFiltered : t.empty}</p>
        {!filtered ? (
          <>
            <p className="max-w-sm text-sm text-muted-foreground">{t.fromSourcing}</p>
            <Link href={`${getModule("sourcing").href}/talent`} className={buttonVariants({ size: "sm" })}>{t.goToSourcing}</Link>
          </>
        ) : null}
      </div>
    );
  }

  const cols = t.columns;
  return (
    <div className="overflow-x-auto rounded-lg border" data-guide="talent-list">
      <table className="w-full min-w-[960px] text-sm">
        <thead className="bg-muted/30 text-xs text-muted-foreground">
          <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
            <th>{cols.person}</th>
            <th>{cols.skills}</th>
            <th>{cols.location}</th>
            <th>{cols.availability}</th>
            <th>{cols.engagement}</th>
            <th className="text-right!">{cols.cost}</th>
            <th>{cols.quality}</th>
            <th>{cols.reliability}</th>
            <th>{cols.status}</th>
          </tr>
        </thead>
        <tbody>
          {people.map((p) => {
            const c = p.candidate;
            const initials = c.fullName.split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("");
            const href = `${base}/${c.id}`;
            return (
              <tr key={c.id} className={cn("relative border-t transition-colors hover:bg-muted/30", p.details.benchStatus === "archived" && "opacity-60")}>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      {c.avatarUrl ? <AvatarImage src={c.avatarUrl} alt="" /> : null}
                      <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <Link href={href} className="font-medium hover:underline after:absolute after:inset-0">
                        {c.fullName}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {[c.role, c.seniority ? dict.sourcing.talent.seniorities[c.seniority] : null].filter(Boolean).join(" · ") || t.detail.unknown}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5"><Chips items={[...c.skills, ...c.technologies.filter((x) => !c.skills.includes(x))]} max={4} /></td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                  {[c.city, c.country].filter(Boolean).join(", ") || t.detail.unknown}
                  {c.remote ? <span className="block">{dict.sourcing.talent.remote}</span> : null}
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={AVAILABILITY_TONE[c.availability ?? "unknown"]} label={t.availabilities[c.availability ?? "unknown"]} />
                  {p.details.availableFrom ? <span className="block text-[11px] text-muted-foreground">{p.details.availableFrom}</span> : null}
                </td>
                <td className="px-3 py-2.5 text-xs">{p.engagementType ? t.engagements[p.engagementType] : t.detail.unknown}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {p.hourlyCost != null ? (
                    <>
                      <span className="font-medium">{p.hourlyCost} {p.costCurrency ?? ""}</span>
                      <span className="block text-[11px] text-muted-foreground">{p.costIsPersonSpecific ? t.detail.personSpecific : t.detail.fromSourcing}</span>
                    </>
                  ) : t.detail.unknown}
                </td>
                <td className="px-3 py-2.5"><RatingDots value={p.ratings.quality} label={cols.quality} /></td>
                <td className="px-3 py-2.5"><RatingDots value={p.ratings.reliability} label={cols.reliability} /></td>
                <td className="px-3 py-2.5"><StatusBadge status={BENCH_TONE[p.details.benchStatus]} label={t.statuses[p.details.benchStatus]} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
