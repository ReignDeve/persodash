"use client";

import React from "react";
import {Button} from "@heroui/button";
import {
  HomeIcon,
  ChartBarIcon,
  ComputerDesktopIcon,
  WalletIcon,
  BellIcon
} from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type SidebarItemKey = "dashboard" | "miner" | "websites" | "wallets" | "notifications";

interface SidebarProps {
  /** Welches Item ist aktuell aktiv? */
  activeItem?: SidebarItemKey;
  /** Callback wenn ein Item geklickt wird (z.B. für Routing / State) */
  onChange?: (key: SidebarItemKey) => void;
}

const items: {key: SidebarItemKey; label: string; href: string; icon: React.ComponentType<{className?: string}>}[] = [
  {key: "dashboard", label: "Dashboard", href: "/", icon: HomeIcon},
  {key: "miner", label: "Miner", href: "/miner", icon: ChartBarIcon},
  {key: "websites", label: "Websites", href: "/websites", icon: ComputerDesktopIcon},
  { key: "wallets", label: "Wallets", href: "/wallets", icon: WalletIcon },
  { key: "notifications", label: "Notifications", href: "/notifications", icon: BellIcon }
];

export const Sidebar: React.FC<SidebarProps> = ({activeItem, onChange}) => {
    const pathname = usePathname();
  return (
    <aside className="w-56 h-screen bg-content1 border-r border-default-100 flex flex-col py-4 px-2 gap-2">
      <div className="px-3 pb-4 items-center flex flex-col">
        <Image src="/logo.svg" alt="Logo" width={80} height={80} />
      </div>

      <nav className="flex flex-col gap-1 mt-4">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link key={item.key} href={item.href}>
              <Button
                size="lg"
                variant={isActive ? "faded" : "light"}
                radius="sm"
                className="justify-start gap-2 w-full text-lg bg-white"
              >
                <Icon className="size-5" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
