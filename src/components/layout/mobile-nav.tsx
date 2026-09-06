"use client";

import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BrandMark } from "@/components/shared/brand-mark";
import { siteConfig } from "@/config/site";

import { SidebarNav } from "./sidebar-nav";
import { useSidebar } from "./sidebar-context";

/** Hamburger + slide-over navigation for screens below `lg`. */
export function MobileNav() {
  const { mobileOpen, setMobileOpen } = useSidebar();

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 gap-0 p-0">
        <SheetHeader className="h-14 justify-center border-b px-4">
          <SheetTitle className="sr-only">{siteConfig.name} navigation</SheetTitle>
          <SheetDescription className="sr-only">Main navigation</SheetDescription>
          <BrandMark />
        </SheetHeader>
        <div className="overflow-y-auto p-3">
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
