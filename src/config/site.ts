export const siteConfig = {
  name: "GRAFIQ OS",
  shortName: "G",
  description: "Internal operating system for the GRAFIQ agency.",
  /** Where authenticated users land after login or when visiting "/". */
  defaultRoute: "/dashboard",
  loginRoute: "/login",
  /** Pages that work without a session (besides login). */
  publicRoutes: ["/apply"],
} as const;
