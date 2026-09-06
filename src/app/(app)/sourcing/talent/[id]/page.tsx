import { notFound } from "next/navigation";

import { moduleMetadata } from "@/lib/i18n/metadata";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { TalentDetail } from "@/modules/sourcing/components/talent/talent-detail";
import { getEntityExtras } from "@/modules/sourcing/queries/entity-extras";
import { listRoleProfiles } from "@/modules/sourcing/queries/role-profiles";
import { getTalent } from "@/modules/sourcing/queries/talent";
import { isClaudeScoringEnabled } from "@/modules/sourcing/scoring";

export const generateMetadata = moduleMetadata("sourcing");

export default async function TalentDetailPage({ params }: PageProps<"/sourcing/talent/[id]">) {
  const { id } = await params;
  const candidate = await getTalent(id);
  if (!candidate) notFound();

  const [dict, locale, extras, roleProfiles] = await Promise.all([getDictionary(), getLocale(), getEntityExtras("talent", id), listRoleProfiles()]);
  return (
    <TalentDetail
      candidate={candidate}
      evaluations={extras.evaluations}
      notes={extras.notes}
      activity={extras.activity}
      sources={extras.sources}
      roleProfiles={roleProfiles}
      aiEnabled={isClaudeScoringEnabled()}
      dict={dict}
      locale={locale}
    />
  );
}
