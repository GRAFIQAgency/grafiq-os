"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/client";

import { saveTalentToBench, updateTalentStatus } from "../../actions/talent";
import { TALENT_STATUSES } from "../../constants";
import type { TalentCandidate, TalentStatus } from "../../types";

export function TalentStatusControls({ candidate }: { candidate: TalentCandidate }) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.sourcing.talent;
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={candidate.status}
        onValueChange={(v) => start(async () => { await updateTalentStatus([candidate.id], v as TalentStatus); router.refresh(); })}
      >
        <SelectTrigger className="w-44" aria-label={t.status}><SelectValue /></SelectTrigger>
        <SelectContent>{TALENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{t.statuses[s]}</SelectItem>)}</SelectContent>
      </Select>
      <Button
        size="sm"
        disabled={pending || candidate.inTalentBench}
        onClick={() => start(async () => { await saveTalentToBench([candidate.id]); router.refresh(); })}
      >
        {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <UserPlus data-icon="inline-start" />}
        {candidate.inTalentBench ? dict.sourcing.review.inBench : dict.sourcing.review.saveToBench}
      </Button>
    </div>
  );
}
