"use client";

import { Bell, LayoutGrid, LogOut, Menu, Moon, Plus, Route, StickyNote, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";

import { useAppActions } from "@/components/shell/app-actions";
import { ALL_NAV_ITEMS, isActive } from "@/components/shell/nav";
import { signOut } from "@/components/shell/user-menu";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/menu";
import { useNotifications } from "@/lib/api/queries";
import { cn } from "@/lib/utils";

/**
 * Phone navigation: the two destinations used on the go (Overview, Logbook),
 * a central create menu (note or trip), Notifications, and "More" for the rest.
 */
export function MobileNav() {
  const pathname = usePathname();
  const { openTripDialog, openCapture } = useAppActions();
  const { data } = useNotifications();
  const [moreOpen, setMoreOpen] = useState(false);

  const tab = (href: string, label: string, Icon: typeof Bell, badge?: number) => {
    const active = isActive(pathname, href);
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex flex-1 flex-col items-center justify-center gap-1 text-2xs transition-colors",
          active ? "text-fg" : "text-subtle",
        )}
      >
        <Icon className="size-[18px]" strokeWidth={1.6} />
        {label}
        {badge ? (
          <span className="absolute top-2 left-1/2 ml-1.5 size-1.5 rounded-full bg-accent" aria-label={`${badge} unread`} />
        ) : null}
      </Link>
    );
  };

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-[var(--z-sidebar)] flex h-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom))] items-stretch border-t bg-sidebar safe-bottom md:hidden"
      >
        {tab("/", "Overview", LayoutGrid)}
        {tab("/logbook", "Logbook", Route)}
        <div className="flex flex-1 items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Create"
                className="flex size-10 items-center justify-center rounded-md bg-fg text-inverse transition-transform active:scale-95"
              >
                <Plus className="size-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="center" sideOffset={10} className="w-48">
              <DropdownMenuItem icon={<StickyNote />} onSelect={() => openCapture()}>
                Capture note
              </DropdownMenuItem>
              <DropdownMenuItem icon={<Route />} onSelect={() => openTripDialog()}>
                Log trip
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {tab("/notifications", "Alerts", Bell, data?.unread)}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 text-2xs text-subtle"
        >
          <Menu className="size-[18px]" strokeWidth={1.6} />
          More
        </button>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent title="PersoDash" side="bottom">
          <MoreSheet pathname={pathname} onNavigate={() => setMoreOpen(false)} />
        </SheetContent>
      </Dialog>
    </>
  );
}

function MoreSheet({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const { resolvedTheme, setTheme } = useTheme();
  const row =
    "flex h-11 items-center gap-3 px-4 text-sm text-muted transition-colors active:bg-hover [&_svg]:size-4";

  return (
    <div className="py-1">
      <ul>
        {ALL_NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(row, isActive(pathname, item.href) && "text-fg")}
            >
              <item.icon strokeWidth={1.6} />
              <span className="flex-1">{item.label}</span>
              <span className="text-xs text-faint">{item.description}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-1 border-t pt-1">
        <button
          type="button"
          className={cn(row, "w-full")}
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "dark" ? <Sun /> : <Moon />}
          {resolvedTheme === "dark" ? "Light theme" : "Dark theme"}
        </button>
        <button type="button" className={cn(row, "w-full")} onClick={signOut}>
          <LogOut />
          Sign out
        </button>
      </div>
    </div>
  );
}
