"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { AppActionsProvider, useAppActions } from "@/components/shell/app-actions";
import { CommandPalette } from "@/components/shell/command-palette";
import { SIDEBAR_COOKIE } from "@/components/shell/constants";
import { MobileNav } from "@/components/shell/mobile-nav";
import { ALL_NAV_ITEMS } from "@/components/shell/nav";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { CaptureDialog } from "@/features/inbox/capture-dialog";
import { TripDialog } from "@/features/logbook/trip-dialog";
import { ProjectDialog } from "@/features/projects/project-dialog";
import { RoutineDialog } from "@/features/routines/routine-dialog";
import { MonitorDialog } from "@/features/services/monitor-dialog";
import { SubscriptionDialog } from "@/features/subscriptions/subscription-dialog";
import { WalletDialog } from "@/features/wallets/wallet-dialog";
import { useHotkeys } from "@/lib/hooks/use-hotkeys";
import { cn } from "@/lib/utils";

type AppShellProps = { children: ReactNode; username: string; initialCollapsed: boolean };

export function AppShell(props: AppShellProps) {
  return (
    <AppActionsProvider>
      <Shell {...props} />
    </AppActionsProvider>
  );
}

function Shell({ children, username, initialCollapsed }: AppShellProps) {
  const router = useRouter();
  const { setCommandOpen, commandOpen, openTripDialog, openCapture } = useAppActions();
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    // Cookie (not localStorage) so the server renders the right width – no flash.
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  };

  useHotkeys({
    "mod+k": () => setCommandOpen(!commandOpen),
    "[": toggleSidebar,
    c: () => openTripDialog(),
    n: () => openCapture(),
    ...Object.fromEntries(ALL_NAV_ITEMS.map((item) => [`g ${item.shortcut}`, () => router.push(item.href)])),
  });

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[var(--z-tooltip)] focus:rounded-md focus:bg-raised focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} username={username} />
      <div
        className={cn(
          "flex min-h-dvh flex-col transition-[padding] duration-200 ease-out",
          "pb-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom))] md:pb-0",
          "md:pl-[var(--sidebar-width-collapsed)]",
          !collapsed && "lg:pl-[var(--sidebar-width)]",
        )}
      >
        <Topbar />
        <main id="main" className="flex-1">
          {children}
        </main>
      </div>
      <MobileNav />
      <CommandPalette />
      <TripDialog />
      <WalletDialog />
      <ProjectDialog />
      <MonitorDialog />
      <SubscriptionDialog />
      <CaptureDialog />
      <RoutineDialog />
    </div>
  );
}
