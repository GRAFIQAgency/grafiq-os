import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { TooltipProvider } from "@/components/ui/tooltip";
import { siteConfig } from "@/config/site";

import "./globals.css";

const fontSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const fontMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // `dark` is the default theme for GRAFIQ OS. Light tokens exist in
    // globals.css, so a theme toggle can be added later without a redesign.
    <html lang="en" className={`${fontSans.variable} ${fontMono.variable} dark h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
