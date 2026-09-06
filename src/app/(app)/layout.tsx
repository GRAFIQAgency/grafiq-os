import { cookies } from "next/headers";

import { AppShell } from "@/components/layout/app-shell";
import { SIDEBAR_COOKIE } from "@/components/layout/sidebar-context";
import { requireUser } from "@/modules/auth/queries";

/**
 * Layout for every authenticated route. The proxy already redirects
 * signed-out visitors, but `requireUser` re-checks on the server so pages
 * never render without a user.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [currentUser, cookieStore] = await Promise.all([requireUser(), cookies()]);
  const defaultSidebarCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed";

  return (
    <AppShell currentUser={currentUser} defaultSidebarCollapsed={defaultSidebarCollapsed}>
      {children}
    </AppShell>
  );
}
