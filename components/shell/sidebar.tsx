"use client";

import { PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAppActions } from "@/components/shell/app-actions";
import { LogoMark, Wordmark } from "@/components/shell/logo";
import { NAV, NAV_FOOTER, isActive, type NavItem } from "@/components/shell/nav";
import { UserMenu } from "@/components/shell/user-menu";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip } from "@/components/ui/tooltip";
import { useNotes, useNotifications, useRoutines } from "@/lib/api/queries";
import { cn } from "@/lib/utils";

type SidebarProps = { collapsed: boolean; onToggle: () => void; username: string };

/**
 * Desktop: full sidebar (collapsible to a rail). Tablet: always the rail.
 * Mobile: hidden – see MobileNav.
 * The "expanded" styles only apply from `lg` and only when not collapsed.
 */
export function Sidebar({ collapsed, onToggle, username }: SidebarProps) {
  const pathname = usePathname();
  const { setCommandOpen } = useAppActions();
  const { data } = useNotifications();
  const notes = useNotes();
  const routines = useRoutines();
  const sectionCounts: Record<string, number | undefined> = {
    "/inbox": notes.data?.counts.open,
    "/routines": routines.data ? routines.data.counts.overdue + routines.data.counts.today : undefined,
  };
  const expanded = !collapsed;

  // Show labels only on lg+ when expanded.
  const labelCls = cn("hidden truncate", expanded && "lg:inline");

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-[var(--z-sidebar)] hidden flex-col border-r bg-sidebar md:flex",
        "w-[var(--sidebar-width-collapsed)] transition-[width] duration-200 ease-out",
        expanded && "lg:w-[var(--sidebar-width)]",
      )}
    >
      <div className={cn("flex h-[var(--topbar-height)] shrink-0 items-center px-3", expanded && "lg:px-4")}>
        <Link
          href="/"
          aria-label="PersoDash overview"
          // Collapsed on desktop, this spot holds the expand button instead (the
          // rail is too narrow for both). Tablets always show the rail + logo.
          className={cn("flex h-8 min-w-0 items-center gap-3 rounded-md px-1.5 text-fg", collapsed && "lg:hidden")}
        >
          <LogoMark />
          <Wordmark className={labelCls} />
        </Link>
        <Tooltip content={expanded ? "Collapse sidebar" : "Expand sidebar"} shortcut="[" side="right">
          <button
            type="button"
            onClick={onToggle}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={expanded}
            className={cn(
              "hidden items-center justify-center rounded-md text-subtle transition-colors hover:bg-hover hover:text-fg lg:flex",
              expanded ? "ml-auto size-7" : "size-8",
            )}
          >
            {expanded ? <PanelLeftClose className="size-3.5" /> : <PanelLeftOpen className="size-4" />}
          </button>
        </Tooltip>
      </div>

      <div className={cn("px-2", expanded && "lg:px-3")}>
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          aria-label="Search and commands"
          className={cn(
            "flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-subtle transition-colors",
            "shadow-[inset_0_0_0_1px_var(--line)] hover:bg-hover hover:text-muted",
          )}
        >
          <Search className="size-3.5 shrink-0" />
          <span className={cn(labelCls, "flex-1 text-left text-sm")}>Search</span>
          <Kbd className={cn("hidden", expanded && "lg:inline-flex")}>⌘K</Kbd>
        </button>
      </div>

      <nav aria-label="Main" className={cn("mt-4 flex-1 overflow-y-auto px-2", expanded && "lg:px-3")}>
        {NAV.map((section, i) => (
          <div key={section.label ?? i} className="mb-4">
            {section.label ? (
              <div className={cn("label mb-1 hidden px-2.5", expanded && "lg:block")}>{section.label}</div>
            ) : null}
            <ul className="flex flex-col gap-px">
              {section.items.map((item) => (
                <li key={item.href}>
                  <SidebarLink
                    item={item}
                    active={isActive(pathname, item.href)}
                    expanded={expanded}
                    count={sectionCounts[item.href]}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn("border-t px-2 py-2", expanded && "lg:px-3")}>
        <ul className="flex flex-col gap-px">
          {NAV_FOOTER.map((item) => (
            <li key={item.href}>
              <SidebarLink
                item={item}
                active={isActive(pathname, item.href)}
                expanded={expanded}
                count={item.href === "/notifications" ? data?.unread : undefined}
              />
            </li>
          ))}
        </ul>
        <UserMenu username={username} expanded={expanded} />
      </div>
    </aside>
  );
}

function SidebarLink({
  item,
  active,
  expanded,
  count,
}: {
  item: NavItem;
  active: boolean;
  expanded: boolean;
  count?: number;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-150",
        active ? "bg-selected text-fg" : "text-muted hover:bg-hover hover:text-fg",
      )}
    >
      {active ? <span aria-hidden className="absolute inset-y-2 -left-2 w-px bg-fg lg:-left-3" /> : null}
      <Icon className="size-[15px] shrink-0" strokeWidth={1.6} />
      <span className={cn("hidden flex-1 truncate", expanded && "lg:inline")}>{item.label}</span>
      {count ? (
        <>
          <span className={cn("hidden font-mono text-2xs text-fg tabular", expanded && "lg:inline")}>{count}</span>
          {/* Rail: unread dot */}
          <span aria-hidden className={cn("absolute top-1.5 right-1.5 size-1.5 rounded-full bg-accent", expanded && "lg:hidden")} />
        </>
      ) : null}
    </Link>
  );

  return (
    <Tooltip content={item.label} shortcut={`G ${item.shortcut.toUpperCase()}`} side="right">
      {link}
    </Tooltip>
  );
}
