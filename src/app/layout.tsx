import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { PwaRegister } from "@/components/layout/pwa-register";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteConfig } from "@/config/site";
import { I18nProvider } from "@/lib/i18n/client";
import { getDictionary, getLocale } from "@/lib/i18n/server";

import "./globals.css";

const fontSans = Geist({ variable: "--font-sans", subsets: ["latin", "latin-ext"] });
const fontMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: siteConfig.name },
  formatDetection: { telephone: false },
};

/** viewportFit "cover" lets the app draw under the iPhone notch; safe-area padding is applied in CSS. */
export const viewport: Viewport = {
  themeColor: "#151515",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);

  return (
    // `dark` is the default theme for GRAFIQ OS. Light tokens exist in
    // globals.css, so a theme toggle can be added later without a redesign.
    <html lang={locale} className={`${fontSans.variable} ${fontMono.variable} dark h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <I18nProvider locale={locale} dict={dict}>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </I18nProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
