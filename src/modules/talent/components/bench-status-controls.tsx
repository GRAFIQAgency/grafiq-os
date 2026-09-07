"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

import { archiveFromBench, restoreToBench } from "../actions";

export function BenchStatusControls({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter();
  const { dict } = useI18n();
  const [pending, start] = useTransition();
  const t = dict.talent.detail;

  return (
    <Button
      size="sm"
      variant={archived ? "default" : "outline"}
      disabled={pending}
      data-guide="talent-status"
      onClick={() => start(async () => { await (archived ? restoreToBench(id) : archiveFromBench(id)); router.refresh(); })}
    >
      {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : archived ? <ArchiveRestore data-icon="inline-start" /> : <Archive data-icon="inline-start" />}
      {archived ? t.restore : t.archive}
    </Button>
  );
}
