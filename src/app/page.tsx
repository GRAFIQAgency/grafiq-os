import { redirect } from "next/navigation";

import { siteConfig } from "@/config/site";

/** "/" has no content of its own; the proxy handles auth, this just forwards. */
export default function RootPage() {
  redirect(siteConfig.defaultRoute);
}
