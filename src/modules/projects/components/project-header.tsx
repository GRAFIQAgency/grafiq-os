"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useI18n } from "@/lib/i18n/client";

import { setProjectStatus } from "../actions/projects";
import { PROJECT_STATUSES } from "../constants";
import type { ProjectStatus } from "../types";
import { NativeSelect } from "./form-primitives";

/** Quick status change (works on mobile too). */
export function ProjectStatusSelect({ id, status }: { id: string; status: ProjectStatus }) {
  const router = useRouter();
  const { dict } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div data-guide="projects-status" className={pending ? "opacity-60" : undefined}>
      <NativeSelect value={status} onChange={(v) => start(async () => { const r = await setProjectStatus(id, v as ProjectStatus); setError(r.error ?? null); router.refresh(); })}
        options={PROJECT_STATUSES.map((s) => ({ value: s, label: dict.projects.statuses[s] }))} className="w-44" />
      {error ? <p className="mt-1 max-w-64 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
