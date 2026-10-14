"use client";

import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { ReactNode } from "react";

import { Kbd } from "@/components/ui/kbd";

export const TooltipProvider = TooltipPrimitive.Provider;

type TooltipProps = {
  content: ReactNode;
  shortcut?: string;
  side?: "top" | "right" | "bottom" | "left";
  children: ReactNode;
};

export function Tooltip({ content, shortcut, side = "bottom", children }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-[var(--z-tooltip)] flex items-center gap-2 rounded-sm bg-overlay px-2 py-1 text-xs text-fg shadow-[var(--shadow-overlay)] data-[state=delayed-open]:animate-fade-in"
        >
          {content}
          {shortcut ? <Kbd>{shortcut}</Kbd> : null}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
