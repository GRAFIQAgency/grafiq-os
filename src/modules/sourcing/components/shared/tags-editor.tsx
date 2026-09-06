"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";

import type { ActionResult } from "../../types";

export function TagsEditor({ tags, onSave }: { tags: string[]; onSave: (tags: string[]) => Promise<ActionResult> }) {
  const router = useRouter();
  const { dict } = useI18n();
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();

  function commit(next: string[]) {
    start(async () => {
      await onSave(next);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-xs">
          {tag}
          <button type="button" onClick={() => commit(tags.filter((x) => x !== tag))} aria-label={`remove ${tag}`} className="text-muted-foreground hover:text-foreground" disabled={pending}>
            <X className="size-3" />
          </button>
        </span>
      ))}
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (!value.trim()) return;
          commit([...tags, value.trim().toLowerCase()]);
          setValue("");
        }}
      >
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={dict.sourcing.review.tagPlaceholder} className="h-7 w-28 text-xs" />
        <Button type="submit" size="xs" variant="ghost" disabled={pending || !value.trim()}>{dict.sourcing.common.addTag}</Button>
      </form>
    </div>
  );
}
