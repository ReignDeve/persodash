import type { Metadata } from "next";

import { LogoMark } from "@/components/shell/logo";
import { ReloadWhenOnline } from "@/components/shell/reload-when-online";

export const metadata: Metadata = { title: "Offline" };
export const dynamic = "force-static";

/** Served by the service worker when the server can't be reached. */
export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <LogoMark className="mb-2 size-5 text-subtle" />
      <h1 className="text-base font-medium">You’re offline</h1>
      <p className="max-w-xs text-sm text-subtle">PersoDash can’t reach your server. It will reload once you’re back online.</p>
      <ReloadWhenOnline />
    </div>
  );
}
