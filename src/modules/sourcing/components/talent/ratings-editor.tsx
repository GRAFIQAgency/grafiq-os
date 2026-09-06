"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n/client";

import { setTalentRatings } from "../../actions/talent";
import { RATING_KEYS } from "../../constants";
import type { TalentRatings } from "../../types";

export function RatingsEditor({ candidateId, ratings }: { candidateId: string; ratings: TalentRatings }) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.sourcing.talent;
  const [draft, setDraft] = useState<Record<string, string>>(Object.fromEntries(RATING_KEYS.map((k) => [k, ratings[k] == null ? "" : String(ratings[k])])));
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const next: TalentRatings = {};
      for (const key of RATING_KEYS) if (draft[key] !== "") next[key] = Number(draft[key]);
      await setTalentRatings(candidateId, next);
      router.refresh();
    });
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {RATING_KEYS.map((key) => (
          <div key={key} className="space-y-1">
            <Label htmlFor={`rating-${key}`} className="text-xs text-muted-foreground">{t.ratingKeys[key]}</Label>
            <Input id={`rating-${key}`} type="number" min={1} max={10} value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} className="h-8 text-right tabular-nums" placeholder="1–10" />
          </div>
        ))}
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>{dict.sourcing.common.saveNotes}</Button>
    </form>
  );
}
