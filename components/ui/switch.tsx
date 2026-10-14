"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import { forwardRef, type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export const Switch = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "relative inline-flex h-[18px] w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-150",
      "bg-line-strong data-[state=checked]:bg-fg disabled:cursor-not-allowed disabled:opacity-40",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "block size-3.5 translate-x-0.5 rounded-full bg-fg shadow-sm transition-transform duration-150",
        "data-[state=checked]:translate-x-[16px] data-[state=checked]:bg-inverse",
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";
