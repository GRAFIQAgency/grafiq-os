import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/config/env";
import { siteConfig } from "@/config/site";

/** Routes reachable without a session. Everything else requires login. */
const PUBLIC_ROUTES = [siteConfig.loginRoute, ...siteConfig.publicRoutes];
/** Public routes that signed-in users should not see (they get sent to the app instead). */
const AUTH_ONLY_ROUTES = [siteConfig.loginRoute];

const matches = (routes: readonly string[], pathname: string) =>
  routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

function isPublicRoute(pathname: string) {
  return matches(PUBLIC_ROUTES, pathname);
}

/**
 * Refreshes the Supabase session cookie on every request and enforces
 * authentication for app routes. Used by `src/proxy.ts`.
 */
export async function updateSession(request: NextRequest) {
  const { url, key } = getSupabaseEnv();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: do not add logic between createServerClient and getUser().
  // getUser() validates the token with Supabase and refreshes it if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  // CORS preflights carry no cookies; route handlers answer them themselves.
  if (isApi && request.method === "OPTIONS") return response;

  if (!user && isApi) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!user && !isPublicRoute(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = siteConfig.loginRoute;
    loginUrl.search = "";
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && matches(AUTH_ONLY_ROUTES, pathname)) {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = siteConfig.defaultRoute;
    appUrl.search = "";
    return NextResponse.redirect(appUrl);
  }

  return response;
}
