"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/** Focus the first form field (not the close button) when a dialog opens. */
function focusFirstField(event: Event) {
  const root = event.currentTarget as HTMLElement | null;
  const field = root?.querySelector<HTMLElement>(
    "[data-autofocus], input:not([type=hidden]):not([type=checkbox]):not([disabled]), textarea:not([disabled])",
  );
  if (field) {
    event.preventDefault();
    field.focus();
  }
}

const overlay =
  "fixed inset-0 z-[var(--z-overlay)] bg-black/50 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out";

type ContentProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Rendered in the footer row, right-aligned. */
  footer?: ReactNode;
};

/** Centered modal on desktop, bottom sheet on small screens. */
export function DialogContent({ title, description, children, footer, className }: ContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlay} />
      <DialogPrimitive.Content
        onOpenAutoFocus={focusFirstField}
        className={cn(
          "fixed z-[var(--z-overlay)] flex flex-col bg-raised shadow-[var(--shadow-overlay)] focus:outline-none",
          "inset-x-0 bottom-0 max-h-[90dvh] rounded-t-lg data-[state=open]:animate-sheet-in-bottom safe-bottom",
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-[14vh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:rounded-lg sm:data-[state=open]:animate-pop-in",
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <DialogPrimitive.Title className="text-base font-medium">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-0.5 text-xs text-subtle">
                {description}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            aria-label="Close"
            className="-mr-1.5 rounded-sm p-1 text-subtle transition-colors hover:bg-hover hover:text-fg"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer ? (
          <footer className="flex items-center justify-end gap-2 border-t px-5 py-3">{footer}</footer>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Side panel (right on desktop, bottom on mobile) for details and secondary navigation. */
export function SheetContent({
  title,
  children,
  side = "right",
  className,
}: {
  title: string;
  children: ReactNode;
  side?: "right" | "bottom";
  className?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlay} />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        className={cn(
          "fixed z-[var(--z-overlay)] flex flex-col bg-raised shadow-[var(--shadow-overlay)] focus:outline-none",
          side === "right"
            ? "inset-y-0 right-0 w-full max-w-md data-[state=open]:animate-sheet-in-right"
            : "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-lg data-[state=open]:animate-sheet-in-bottom safe-bottom",
          className,
        )}
      >
        <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
          <DialogPrimitive.Title className="text-sm font-medium">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close
            aria-label="Close"
            className="rounded-sm p-1 text-subtle transition-colors hover:bg-hover hover:text-fg"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
