import { Suspense, type ReactNode } from "react";

import type { CurrentUser } from "@/modules/auth/types";
import { GuideSpotlight } from "@/modules/guide/components/guide-spotlight";

import { Sidebar } from "./sidebar";
import { SidebarProvider } from "./sidebar-context";
import { Topbar } from "./topbar";

interface AppShellProps {
  currentUser: CurrentUser;
  defaultSidebarCollapsed: boolean;
  children: ReactNode;
}

/** Sidebar + top bar + scrollable content area. Wraps every authenticated page. */
export function AppShell({ currentUser, defaultSidebarCollapsed, children }: AppShellProps) {
  return (
    <SidebarProvider defaultCollapsed={defaultSidebarCollapsed}>
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar currentUser={currentUser} />
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
          <Suspense fallback={null}>
            <GuideSpotlight />
          </Suspense>
        </div>
      </div>
    </SidebarProvider>
  );
}
