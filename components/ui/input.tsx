import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const fieldControl = cn(
  "w-full rounded-md bg-bg px-2.5 text-sm text-fg placeholder:text-faint",
  "shadow-[inset_0_0_0_1px_var(--line-strong)] transition-shadow duration-150",
  "hover:shadow-[inset_0_0_0_1px_var(--fg-faint)]",
  "focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_1px_var(--accent)]",
  "aria-invalid:shadow-[inset_0_0_0_1px_var(--err)]",
  "disabled:opacity-50",
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldControl, "h-8", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 3, ...props }, ref) => (
    <textarea ref={ref} rows={rows} className={cn(fieldControl, "resize-none py-1.5", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";
