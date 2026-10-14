"use client";

import { Activity, CalendarCheck, FolderGit2, Plus, Repeat, Route, Search, StickyNote, Wallet } from "lucide-react";
import { usePathname } from "next/navigation";

import { useAppActions } from "@/components/shell/app-actions";
import { LogoMark } from "@/components/shell/logo";
import { NAV, currentNavItem } from "@/components/shell/nav";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { Tooltip } from "@/components/ui/tooltip";

function sectionOf(href: string) {
  return NAV.find((s) => s.items.some((i) => i.href === href))?.label ?? null;
}

export function Topbar() {
  const pathname = usePathname();
  const { setCommandOpen, openTripDialog, setWalletDialogOpen, openEditor, openCapture } = useAppActions();
  const item = currentNavItem(pathname);
  const section = item ? sectionOf(item.href) : null;

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] flex h-[var(--topbar-height)] shrink-0 items-center gap-3 border-b bg-bg px-4 md:px-6 lg:px-8">
      <LogoMark className="text-fg md:hidden" />
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
        {section ? (
          <>
            <span className="hidden text-subtle sm:inline">{section}</span>
            <span aria-hidden className="hidden text-faint sm:inline">
              /
            </span>
          </>
        ) : null}
        <span className="truncate text-fg">{item?.label ?? "PersoDash"}</span>
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <Tooltip content="Search" shortcut="⌘K">
          <Button variant="ghost" size="icon-sm" aria-label="Search" onClick={() => setCommandOpen(true)} className="md:hidden">
            <Search />
          </Button>
        </Tooltip>
        <DropdownMenu>
          <Tooltip content="Create" shortcut="C">
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hidden md:inline-flex" aria-label="Create">
                <Plus />
                New
              </Button>
            </DropdownMenuTrigger>
          </Tooltip>
          <DropdownMenuContent>
            <DropdownMenuItem icon={<StickyNote />} onSelect={() => openCapture()} shortcut="N">
              Capture note
            </DropdownMenuItem>
            <DropdownMenuItem icon={<Route />} onSelect={() => openTripDialog()} shortcut="C">
              Log trip
            </DropdownMenuItem>
            <DropdownMenuItem icon={<CalendarCheck />} onSelect={() => openEditor({ kind: "routine", item: null })}>
              New routine
            </DropdownMenuItem>
            <DropdownMenuItem icon={<FolderGit2 />} onSelect={() => openEditor({ kind: "project", item: null })}>
              New project
            </DropdownMenuItem>
            <DropdownMenuItem icon={<Activity />} onSelect={() => openEditor({ kind: "monitor", item: null })}>
              Monitor a service
            </DropdownMenuItem>
            <DropdownMenuItem icon={<Repeat />} onSelect={() => openEditor({ kind: "subscription", item: null })}>
              Add subscription
            </DropdownMenuItem>
            <DropdownMenuItem icon={<Wallet />} onSelect={() => setWalletDialogOpen(true)}>
              Add wallet
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
