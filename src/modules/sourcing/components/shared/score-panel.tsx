"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/client";
import { INTL_LOCALES } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";

import type { ActionResult, AiEvaluation, RoleProfile } from "../../types";
import { ScoreBadge } from "./score-badge";

interface ScorePanelProps {
  evaluation: AiEvaluation | null;
  score: number | null;
  manualScore: number | null;
  highFrom: number;
  aiEnabled: boolean;
  roleProfiles?: RoleProfile[];
  onOverride: (score: number | null) => Promise<ActionResult>;
  onRescore: (roleProfileId: string | null, useAi: boolean) => Promise<ActionResult>;
}

const NONE = "__none__";

export function ScorePanel({ evaluation, score, manualScore, highFrom, aiEnabled, roleProfiles, onOverride, onRescore }: ScorePanelProps) {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const t = dict.sourcing.score;
  const [override, setOverride] = useState(manualScore == null ? "" : String(manualScore));
  const [profileId, setProfileId] = useState<string>(evaluation?.roleProfileId ?? roleProfiles?.[0]?.id ?? NONE);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const act = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn();
      setError(r.error ?? null);
      router.refresh();
    });

  const list = (title: string, items: string[]) =>
    items.length ? (
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
        <ul className="list-disc space-y-0.5 pl-4 text-sm">{items.map((i) => <li key={i}>{i}</li>)}</ul>
      </div>
    ) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <ScoreBadge score={score} manual={manualScore} highFrom={highFrom} size="lg" />
        <div className="text-xs text-muted-foreground">
          {evaluation ? (
            <>
              <span>{t.provider}: {evaluation.provider === "claude" ? t.claude : t.heuristic}{evaluation.model ? ` (${evaluation.model})` : ""}</span>
              <br />
              <span>{interpolate(t.evaluatedAt, { date: new Intl.DateTimeFormat(INTL_LOCALES[locale], { dateStyle: "medium", timeStyle: "short" }).format(new Date(evaluation.createdAt)) })}</span>
            </>
          ) : t.noEvaluation}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {roleProfiles ? (
            <Select value={profileId} onValueChange={setProfileId}>
              <SelectTrigger className="w-52" aria-label={dict.sourcing.talent.roleProfile}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{dict.sourcing.talent.noProfile}</SelectItem>
                {roleProfiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : null}
          <Button size="sm" variant="outline" disabled={pending} onClick={() => act(() => onRescore(profileId === NONE ? null : profileId, false))}>
            {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
            {dict.sourcing.talent.rescore}
          </Button>
          {aiEnabled ? (
            <Button size="sm" disabled={pending} onClick={() => act(() => onRescore(profileId === NONE ? null : profileId, true))}>
              <Sparkles data-icon="inline-start" />
              {dict.sourcing.talent.rescoreAi}
            </Button>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{t.advisory}</p>

      {evaluation ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {list(t.strengths, evaluation.strengths)}
          {list(t.weaknesses, evaluation.weaknesses)}
          {list(t.missing, evaluation.missingInfo)}
          {list(t.risks, evaluation.risks)}
          {evaluation.reasoning ? (
            <div className="md:col-span-2">
              <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.why}</p>
              <p className="text-sm">{evaluation.reasoning}</p>
            </div>
          ) : null}
          {evaluation.factors.length ? (
            <div className="md:col-span-2">
              <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.factors}</p>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                {evaluation.factors.map((f) => (
                  <li key={f.factor} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{f.factor}{f.note ? ` (${f.note})` : ""}</span>
                    <span className="tabular-nums">{Math.round(f.score)} × {f.weight}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <form
        className="flex flex-wrap items-center gap-2 border-t pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          act(() => onOverride(override === "" ? null : Number(override)));
        }}
      >
        <span className="text-sm text-muted-foreground">{t.override}</span>
        <Input type="number" min={0} max={100} value={override} onChange={(e) => setOverride(e.target.value)} placeholder={t.overridePlaceholder} className="w-24 text-right tabular-nums" />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>{t.setOverride}</Button>
        {manualScore != null ? (
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => { setOverride(""); act(() => onOverride(null)); }}>
            {t.clearOverride}
          </Button>
        ) : null}
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </form>
    </div>
  );
}
