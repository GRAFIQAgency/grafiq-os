import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

/** Web app manifest → makes GRAFIQ OS installable (Add to Home Screen on iOS, install prompt on Android/desktop). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: siteConfig.defaultRoute,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1B1B1B",
    theme_color: "#151515",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
