import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { SIDEBAR_COOKIE } from "@/components/shell/constants";
import { DatabaseUnavailable } from "@/components/shell/database-unavailable";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/session";
import { isDatabaseUnavailable } from "@/lib/db-errors";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Real session validation (the proxy only checks that a cookie exists).
  let user: CurrentUser | null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (isDatabaseUnavailable(error)) return <DatabaseUnavailable />;
    throw error;
  }
  if (!user) redirect("/login");

  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "1";

  return (
    <AppShell username={user.username} initialCollapsed={collapsed}>
      {children}
    </AppShell>
  );
}
