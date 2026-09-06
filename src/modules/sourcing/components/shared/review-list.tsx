"use client";

import { useCallback, useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Tag } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/interpolate";

import type { ActionResult } from "../../types";

export interface ReviewActions {
  approve: (ids: string[]) => Promise<ActionResult>;
  reject: (ids: string[]) => Promise<ActionResult>;
  save: (ids: string[]) => Promise<ActionResult>;
  review: (ids: string[]) => Promise<ActionResult>;
  addTag: (ids: string[], tag: string) => Promise<ActionResult>;
}

export interface ReviewCardState {
  active: boolean;
  selected: boolean;
  busy: boolean;
  toggle: () => void;
  act: (kind: keyof ReviewActions) => void;
}

interface ReviewListProps<T extends { id: string }> {
  items: T[];
  actions: ReviewActions;
  saveLabel: string;
  renderCard: (item: T, state: ReviewCardState) => ReactNode;
  toCsvRow: (item: T) => Record<string, string | number | null | undefined>;
  exportName: string;
}

const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  return Boolean(el && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable));
};

/**
 * Inbox-style review list: keyboard navigation, single/bulk actions, CSV export.
 * Entity-agnostic — the card and actions come from the caller.
 */
export function ReviewList<T extends { id: string }>({ items, actions, saveLabel, renderCard, toCsvRow, exportName }: ReviewListProps<T>) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.sourcing.review;
  const [rawActiveIndex, setActiveIndex] = useState(0);
  // Derived, so a shrinking list never leaves the cursor out of range.
  const activeIndex = Math.min(rawActiveIndex, Math.max(0, items.length - 1));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [tag, setTag] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const run = useCallback(
    (kind: keyof ReviewActions, ids: string[], extra?: string) => {
      if (!ids.length) return;
      setBusyIds(new Set(ids));
      setMessage(null);
      startTransition(async () => {
        const result = kind === "addTag" ? await actions.addTag(ids, extra ?? "") : await actions[kind](ids);
        setBusyIds(new Set());
        setMessage(result.error ?? t.done);
        if (!result.error) {
          setSelected((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.delete(id));
            return next;
          });
          router.refresh();
        }
      });
    },
    [actions, router, t.done]
  );

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const active = items[activeIndex];
      const move = (delta: number) => setActiveIndex((i) => Math.max(0, Math.min(items.length - 1, i + delta)));
      switch (e.key) {
        case "ArrowDown": case "j": e.preventDefault(); move(1); break;
        case "ArrowUp": case "k": e.preventDefault(); move(-1); break;
        case "x": case "X": move(1); break;
        case " ": if (active) { e.preventDefault(); toggle(active.id); } break;
        case "a": case "A": if (active) { run("approve", [active.id]); move(1); } break;
        case "r": case "R": if (active) { run("reject", [active.id]); move(1); } break;
        case "s": case "S": if (active) { run("save", [active.id]); move(1); } break;
        default: return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, activeIndex, run, toggle]);

  function exportCsv() {
    const rows = (selected.size ? items.filter((i) => selected.has(i.id)) : items).map(toCsvRow);
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectedIds = [...selected];
  const allSelected = items.length > 0 && selectedIds.length === items.length;

  if (items.length === 0) {
    return <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground" data-guide="sourcing-review">{t.noResults}</div>;
  }

  return (
    <div className="space-y-3" data-guide="sourcing-review">
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card/60 px-3 py-2 text-xs text-muted-foreground">
        <label className="flex items-center gap-2">
          <Checkbox checked={allSelected} onCheckedChange={(v) => setSelected(v ? new Set(items.map((i) => i.id)) : new Set())} aria-label="select all" />
          <span>{interpolate(t.selected, { n: selectedIds.length })}</span>
        </label>
        <span className="hidden md:inline">·</span>
        <span className="hidden md:inline">{t.hint}</span>
        {message ? <span className={cn("ml-auto", message !== t.done && "text-destructive")}>{message}</span> : null}
      </div>

      {selectedIds.length > 0 ? (
        <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 rounded-md border bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
          <Button size="sm" variant="outline" onClick={() => run("review", selectedIds)}>{t.markReviewed}</Button>
          <Button size="sm" variant="outline" onClick={() => run("reject", selectedIds)}>{t.reject}</Button>
          <Button size="sm" onClick={() => run("save", selectedIds)}>{saveLabel}</Button>
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              run("addTag", selectedIds, tag);
              setTag("");
            }}
          >
            <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder={t.tagPlaceholder} className="h-8 w-32" />
            <Button size="sm" variant="ghost" type="submit" disabled={!tag.trim()}>
              <Tag data-icon="inline-start" />
              {t.addTag}
            </Button>
          </form>
          <Button size="sm" variant="ghost" onClick={exportCsv}>
            <Download data-icon="inline-start" />
            {t.export}
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>{t.clearSelection}</Button>
        </div>
      ) : null}

      <ul className="space-y-2">
        {items.map((item, index) => {
          const busy = busyIds.has(item.id);
          return (
            <li key={item.id} onClick={() => setActiveIndex(index)} className="relative">
              {busy ? <Loader2 className="absolute top-3 right-3 size-4 animate-spin text-muted-foreground" /> : null}
              {renderCard(item, {
                active: index === activeIndex,
                selected: selected.has(item.id),
                busy,
                toggle: () => toggle(item.id),
                act: (kind) => run(kind, [item.id]),
              })}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
