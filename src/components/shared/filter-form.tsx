import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Primitives for GET filter forms (server components). Submitting reloads with new URL params. */

export function FilterField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function TextFilter({ name, defaultValue, placeholder, type = "text" }: { name: string; defaultValue?: string | number; placeholder?: string; type?: string }) {
  return <Input name={name} defaultValue={defaultValue ?? ""} placeholder={placeholder} type={type} className="h-8" />;
}

const ANY = "__any__";

export function SelectFilter({ name, defaultValue, options, anyLabel, allowAny = true }: { name: string; defaultValue?: string; options: { value: string; label: string }[]; anyLabel: string; allowAny?: boolean }) {
  return (
    <Select name={name} defaultValue={defaultValue ?? (allowAny ? ANY : options[0]?.value)}>
      <SelectTrigger className="h-8 w-full" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allowAny ? <SelectItem value={ANY}>{anyLabel}</SelectItem> : null}
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function FilterActions({ applyLabel, clearLabel, clearHref }: { applyLabel: string; clearLabel: string; clearHref: string }) {
  return (
    <div className="flex items-center gap-2">
      <button type="submit" className={buttonVariants({ size: "sm" })}>{applyLabel}</button>
      <a href={clearHref} className={buttonVariants({ size: "sm", variant: "ghost" })}>{clearLabel}</a>
    </div>
  );
}

/** Strips the "any" placeholder value so it is not sent as a filter. */
export const ANY_VALUE = ANY;
