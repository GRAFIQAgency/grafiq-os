import { Search } from "lucide-react";

interface SearchPlaceholderProps {
  label: string;
}

/**
 * Visual placeholder for a future global search / command palette.
 * Intentionally non-functional in this phase.
 */
export function SearchPlaceholder({ label }: SearchPlaceholderProps) {
  return (
    <div
      role="search"
      className="hidden h-8 w-64 items-center gap-2 rounded-md border bg-muted/30 px-3 text-sm text-muted-foreground md:flex"
    >
      <Search className="size-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate">{label}</span>
      <kbd className="hidden rounded border bg-background px-1.5 font-mono text-[10px] text-muted-foreground lg:inline-block">
        ⌘K
      </kbd>
    </div>
  );
}
