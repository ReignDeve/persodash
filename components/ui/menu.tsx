"use client";

import { ChevronRight } from "lucide-react";
import { ContextMenu as CM, DropdownMenu as DM } from "radix-ui";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

// Dropdown and context menus share one visual language.

const content = cn(
  "z-[var(--z-overlay)] min-w-44 overflow-hidden rounded-lg bg-overlay p-1",
  "shadow-[var(--shadow-overlay)] data-[state=open]:animate-pop-in",
);

const item = cn(
  "flex h-7 cursor-default select-none items-center gap-2 rounded-sm px-2 text-sm text-muted outline-none",
  "data-[highlighted]:bg-selected data-[highlighted]:text-fg data-[disabled]:opacity-40",
  "[&_svg]:size-3.5 [&_svg]:shrink-0",
);

const danger = "text-err data-[highlighted]:bg-err/12 data-[highlighted]:text-err";

type ItemProps = {
  children: ReactNode;
  onSelect?: () => void;
  icon?: ReactNode;
  shortcut?: string;
  destructive?: boolean;
  disabled?: boolean;
};

function ItemBody({ icon, children, shortcut }: Pick<ItemProps, "icon" | "children" | "shortcut">) {
  return (
    <>
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {shortcut ? <span className="font-mono text-2xs text-faint">{shortcut}</span> : null}
    </>
  );
}

// Dropdown ------------------------------------------------------------------

export const DropdownMenu = DM.Root;
export const DropdownMenuTrigger = DM.Trigger;

export function DropdownMenuContent({
  className,
  align = "end",
  ...props
}: ComponentPropsWithoutRef<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content sideOffset={4} align={align} className={cn(content, className)} {...props} />
    </DM.Portal>
  );
}

export function DropdownMenuItem({ onSelect, destructive, disabled, ...body }: ItemProps) {
  return (
    <DM.Item onSelect={onSelect} disabled={disabled} className={cn(item, destructive && danger)}>
      <ItemBody {...body} />
    </DM.Item>
  );
}

export const DropdownMenuSub = DM.Sub;

export function DropdownMenuSubTrigger({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <DM.SubTrigger className={cn(item, "data-[state=open]:bg-selected data-[state=open]:text-fg")}>
      {icon}
      <span className="flex-1 truncate">{children}</span>
      <ChevronRight className="text-faint" />
    </DM.SubTrigger>
  );
}

export function DropdownMenuSubContent({ className, ...props }: ComponentPropsWithoutRef<typeof DM.SubContent>) {
  return (
    <DM.Portal>
      <DM.SubContent sideOffset={4} className={cn(content, "max-h-72 overflow-y-auto", className)} {...props} />
    </DM.Portal>
  );
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return <DM.Label className="label px-2 pt-1.5 pb-1">{children}</DM.Label>;
}

export function DropdownMenuSeparator() {
  return <DM.Separator className="-mx-1 my-1 h-px bg-line" />;
}

// Context menu --------------------------------------------------------------

export const ContextMenu = CM.Root;
export const ContextMenuTrigger = CM.Trigger;

export function ContextMenuContent({ className, ...props }: ComponentPropsWithoutRef<typeof CM.Content>) {
  return (
    <CM.Portal>
      <CM.Content className={cn(content, className)} {...props} />
    </CM.Portal>
  );
}

export function ContextMenuItem({ onSelect, destructive, disabled, ...body }: ItemProps) {
  return (
    <CM.Item onSelect={onSelect} disabled={disabled} className={cn(item, destructive && danger)}>
      <ItemBody {...body} />
    </CM.Item>
  );
}

export function ContextMenuSeparator() {
  return <CM.Separator className="-mx-1 my-1 h-px bg-line" />;
}
