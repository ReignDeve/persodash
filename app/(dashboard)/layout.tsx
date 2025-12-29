"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "../components/sidebar";
import Navbar from "../components/navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // TODO: improve this logic
  let active: "dashboard" | "miner" | "websites" | "wallets" | "notifications" =
    "dashboard";

  if (pathname.startsWith("/miner")) active = "miner";
  else if (pathname.startsWith("/websites")) active = "websites";
  else if (pathname.startsWith("/wallets")) active = "wallets";
  else if (pathname.startsWith("/notifications")) active = "notifications";

  return (
    <div className="relative flex h-screen">
      <Sidebar activeItem={active} />
      <div className="flex flex-col flex-1">
        <Navbar />
        <main className="container mx-auto max-w-full pt-6 px-6 flex-grow">
          {children}
        </main>
      </div>
    </div>
  );
}
