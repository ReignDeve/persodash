"use client";

import { ToggleGroup } from "radix-ui";

import { cn } from "@/lib/utils";

type SegmentedProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly { value: T; label: string; count?: number }[];
  "aria-label": string;
  className?: string;
};

/** Compact single-choice filter (keyboard: arrow keys). */
export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  className,
  ...props
}: SegmentedProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v as T)}
      aria-label={props["aria-label"]}
      className={cn("inline-flex h-7 items-center rounded-md bg-surface p-0.5 shadow-[inset_0_0_0_1px_var(--line)]", className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          className={cn(
            "inline-flex h-6 items-center gap-1.5 rounded-sm px-2.5 text-xs text-subtle transition-colors duration-150",
            "hover:text-fg data-[state=on]:bg-selected data-[state=on]:text-fg",
          )}
        >
          {o.label}
          {o.count !== undefined ? <span className="font-mono text-2xs text-faint tabular">{o.count}</span> : null}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
