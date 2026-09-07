"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/client";

import { setDealStage } from "../actions";
import { CRM_STAGES } from "../constants";
import type { CrmStage } from "../types";

/** Stage select in the deal header. Choosing "lost" asks for a reason first. */
export function StageControls({ id, stage }: { id: string; stage: CrmStage }) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.sales;
  const [pending, start] = useTransition();
  const [askReason, setAskReason] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function move(next: CrmStage, lostReason?: string) {
    start(async () => {
      const r = await setDealStage(id, next, lostReason ?? null);
      setError(r.error ?? null);
      if (!r.error) {
        setAskReason(false);
        setReason("");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2" data-guide="sales-stage">
      <div className="flex items-center gap-2">
        {pending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
        <Select value={stage} onValueChange={(v) => (v === "lost" ? setAskReason(true) : move(v as CrmStage))}>
          <SelectTrigger className="w-48" aria-label={t.columns.stage}><SelectValue /></SelectTrigger>
          <SelectContent>{CRM_STAGES.map((s) => <SelectItem key={s} value={s}>{t.stages[s]}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {askReason ? (
        <form className="flex w-full max-w-sm items-center gap-2" onSubmit={(e) => { e.preventDefault(); move("lost", reason); }}>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.detail.lostReasonPlaceholder} autoFocus aria-label={t.detail.lostReason} />
          <Button type="submit" size="sm" variant="destructive" disabled={pending || !reason.trim()}>{t.detail.markLost}</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setAskReason(false)}>{t.detail.cancel}</Button>
        </form>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
