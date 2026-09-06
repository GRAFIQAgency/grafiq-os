"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bookmark, Loader2, Radar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/interpolate";

import { runSearch, saveSearch } from "../../actions/search";
import type { EntityType, SearchRun } from "../../types";

interface SearchToolbarProps {
  entityType: EntityType;
}

/** "Search sources" (runs connectors with the current URL filters) + "Save search". */
export function SearchToolbar({ entityType }: SearchToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dict } = useI18n();
  const t = dict.sourcing.search;
  const [isRunning, startRun] = useTransition();
  const [isSaving, startSave] = useTransition();
  const [run, setRun] = useState<SearchRun | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");

  const filters = Object.fromEntries(searchParams.entries());

  function search() {
    setMessage(null);
    startRun(async () => {
      const result = await runSearch({ entityType, filters });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setRun(result.run ?? null);
      if (result.run && result.run.sourcesTotal === 0) setMessage(t.noConnectors);
      router.refresh();
    });
  }

  function save() {
    startSave(async () => {
      const result = await saveSearch({ entityType, name, filters });
      setMessage(result.error ?? t.saved);
      if (!result.error) {
        setSaveOpen(false);
        setName("");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" onClick={search} disabled={isRunning} data-guide="sourcing-search">
        {isRunning ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Radar data-icon="inline-start" />}
        {isRunning ? t.running : t.run}
      </Button>
      {saveOpen ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.saveName} className="w-48" autoFocus />
          <Button type="submit" variant="outline" size="sm" disabled={isSaving || !name.trim()}>
            {t.save}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setSaveOpen(false)}>
            {t.clear}
          </Button>
        </form>
      ) : (
        <Button type="button" variant="outline" onClick={() => setSaveOpen(true)}>
          <Bookmark data-icon="inline-start" />
          {t.save}
        </Button>
      )}
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        {run
          ? interpolate(t.lastRun, { new: run.resultsNew, dup: run.resultsDuplicates, sources: run.sourcesCompleted }) +
            (run.errors.length ? ` ${interpolate(t.runErrors, { n: run.errors.length })}` : "")
          : null}
        {message ? <span className={message === t.saved ? "" : "text-destructive"}> {message}</span> : null}
      </p>
    </div>
  );
}
