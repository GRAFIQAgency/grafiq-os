import { getDictionary } from "@/lib/i18n/server";
import type { CurrentUser } from "@/modules/auth/types";
import { GuideHelpButton } from "@/modules/guide/components/guide-help-button";

import { LanguageSwitcher } from "./language-switcher";
import { MobileNav } from "./mobile-nav";
import { PageTitle } from "./page-title";
import { SearchPlaceholder } from "./search-placeholder";
import { UserMenu } from "./user-menu";

interface TopbarProps {
  currentUser: CurrentUser;
}

export async function Topbar({ currentUser }: TopbarProps) {
  const dict = await getDictionary();

  return (
    <header className="safe-top sticky top-0 z-30 flex min-h-14 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
      <MobileNav />
      <div className="min-w-0 flex-1">
        <PageTitle />
      </div>
      <SearchPlaceholder label={dict.common.search} />
      <LanguageSwitcher />
      <GuideHelpButton />
      <UserMenu currentUser={currentUser} />
    </header>
  );
}
