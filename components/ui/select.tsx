"use client";

import { Check, ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { forwardRef, type ComponentPropsWithoutRef } from "react";

import { fieldControl } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

type SelectProps = Omit<ComponentPropsWithoutRef<typeof SelectPrimitive.Root>, "children"> & {
  options: readonly SelectOption[];
  placeholder?: string;
  id?: string;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-label"?: string;
  size?: "sm" | "md";
};

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  ({ options, placeholder, id, className, size = "md", ...props }, ref) => (
    <SelectPrimitive.Root {...props}>
      <SelectPrimitive.Trigger
        ref={ref}
        id={id}
        aria-invalid={props["aria-invalid"]}
        aria-describedby={props["aria-describedby"]}
        aria-label={props["aria-label"]}
        className={cn(
          fieldControl,
          "inline-flex items-center justify-between gap-2 text-left data-[placeholder]:text-faint",
          size === "sm" ? "h-7 text-xs" : "h-8",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="size-3.5 text-subtle" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className={cn(
            "z-[var(--z-overlay)] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg",
            "bg-overlay p-1 shadow-[var(--shadow-overlay)] data-[state=open]:animate-pop-in",
          )}
        >
          <SelectPrimitive.Viewport>
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.value}
                value={o.value}
                className={cn(
                  "relative flex h-7 cursor-default select-none items-center rounded-sm pl-2 pr-7 text-sm text-muted outline-none",
                  "data-[highlighted]:bg-selected data-[highlighted]:text-fg data-[state=checked]:text-fg",
                )}
              >
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2">
                  <Check className="size-3.5" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  ),
);
Select.displayName = "Select";
