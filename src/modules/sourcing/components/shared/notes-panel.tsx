"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/client";
import { INTL_LOCALES } from "@/lib/i18n/config";

import { addNote } from "../../actions/notes";
import type { ActivityEntityType } from "../../services/activity";
import type { InternalNote } from "../../types";

export function NotesPanel({ entityType, entityId, notes }: { entityType: ActivityEntityType; entityId: string; notes: InternalNote[] }) {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const t = dict.sourcing.common;
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fmt = new Intl.DateTimeFormat(INTL_LOCALES[locale], { dateStyle: "medium", timeStyle: "short" });

  function submit() {
    start(async () => {
      const result = await addNote(entityType, entityId, body);
      setError(result.error ?? null);
      if (!result.error) {
        setBody("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={t.notePlaceholder} rows={3} />
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={pending || !body.trim()}>{t.addNote}</Button>
          {error ? <span className="text-xs text-destructive">{error}</span> : null}
        </div>
      </form>
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noNotes}</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-md border px-3 py-2 text-sm">
              <p className="whitespace-pre-wrap">{n.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{n.authorName ?? "—"} · {fmt.format(new Date(n.createdAt))}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
