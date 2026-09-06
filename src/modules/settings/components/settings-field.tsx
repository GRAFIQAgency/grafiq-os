import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

interface SettingsFieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

/** Label + control + error, shared by the settings forms. */
export function SettingsField({ label, htmlFor, hint, error, className, children }: SettingsFieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="mb-2 block">
        {label}
      </Label>
      {children}
      {hint && !error ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

interface PercentInputWrapProps {
  children: ReactNode;
}

/** Puts a "%" suffix inside an input. */
export function PercentInputWrap({ children }: PercentInputWrapProps) {
  return (
    <div className="relative">
      {children}
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
        %
      </span>
    </div>
  );
}
