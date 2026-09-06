"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export const SIDEBAR_COOKIE = "grafiq:sidebar";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
  /** Mobile navigation drawer. */
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

interface SidebarProviderProps {
  /** Initial value, read from the cookie on the server to avoid layout flicker. */
  defaultCollapsed: boolean;
  children: ReactNode;
}

export function SidebarProvider({ defaultCollapsed, children }: SidebarProviderProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ collapsed, toggle, mobileOpen, setMobileOpen }),
    [collapsed, toggle, mobileOpen]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used inside <SidebarProvider>");
  return ctx;
}
