import { Label } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** Label + control + error/hint. Errors are linked via aria-describedby by the control. */
export function Field({ label, htmlFor, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label.Root htmlFor={htmlFor} className="text-xs font-medium text-muted">
        {label}
      </Label.Root>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-err">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

/** Props to spread onto a control so it is wired to its Field's error. */
export function fieldA11y(id: string, error?: string) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  } as const;
}
