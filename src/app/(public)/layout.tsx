import { BrandMark } from "@/components/shared/brand-mark";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

/** Chrome-free layout for public pages (no session required). */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex h-14 items-center justify-between px-6">
        <BrandMark />
        <LanguageSwitcher />
      </div>
      <div className="flex flex-1 justify-center px-4 pb-16">
        <div className="w-full max-w-2xl">{children}</div>
      </div>
    </div>
  );
}
