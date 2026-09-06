"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { GUIDE_STEPS } from "./content";

const STORAGE_KEY = "grafiq:guide:done";
export const WELCOME_KEY = "grafiq:guide:welcome-dismissed";

function read(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/** Per-browser completion state for guide steps (no server round trip needed). */
export function useGuideProgress() {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = read();
    // Sync from storage once after mount (localStorage is unavailable during SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDone(stored);
    setLoaded(true);
  }, []);

  const persist = useCallback((next: Set<string>) => {
    setDone(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {}
  }, []);

  const markDone = useCallback((id: string) => persist(new Set([...read(), id])), [persist]);
  const toggle = useCallback((id: string) => {
    const next = read();
    if (next.has(id)) next.delete(id);
    else next.add(id);
    persist(next);
  }, [persist]);
  const reset = useCallback(() => persist(new Set()), [persist]);

  const percent = useMemo(() => Math.round((GUIDE_STEPS.filter((s) => done.has(s.id)).length / GUIDE_STEPS.length) * 100), [done]);

  return { done, loaded, markDone, toggle, reset, percent };
}
