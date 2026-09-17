export const siteConfig = {
  name: "GRAFIQ OS",
  shortName: "G",
  description: "Internal operating system for the GRAFIQ agency.",
  /** Where authenticated users land after login or when visiting "/". */
  defaultRoute: "/dashboard",
  loginRoute: "/login",
  /** Pages that work without a session (besides login). */
  publicRoutes: ["/apply", "/offline", "/p"],
  /**
   * API routes that carry their own credential instead of a session cookie
   * (the Hermes MCP endpoint authenticates with a bearer token). The proxy
   * must not answer for them — they do their own 401.
   */
  tokenAuthRoutes: ["/api/mcp"],
} as const;
