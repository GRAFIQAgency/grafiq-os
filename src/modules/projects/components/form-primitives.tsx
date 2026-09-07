"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export const selectClass = "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";

export function Field({ name, label, error, hint, children, className }: { name: string; label: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label htmlFor={name} className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      {children}
      {hint && !error ? <p className="mt-1 text-xs text-muted-foreground/70">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function NativeSelect({ name, defaultValue, value, onChange, options, placeholder, className, id }: {
  name?: string; defaultValue?: string; value?: string; onChange?: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string; className?: string; id?: string;
}) {
  return (
    <select id={id ?? name} name={name} defaultValue={value === undefined ? defaultValue ?? "" : undefined} value={value} onChange={onChange ? (e) => onChange(e.target.value) : undefined} className={cn(selectClass, className)}>
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
