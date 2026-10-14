import "server-only";

import { db } from "@/lib/db";
import { formatKm } from "@/lib/format";
import type { ActivityItem } from "@/lib/schemas/overview";
import { CHAIN_META } from "@/lib/schemas/wallets";
import { getWebsites } from "@/server/services/websites";

const LIMIT = 12;
/** Per-source cap so one busy module cannot flood the feed. */
const PER_SOURCE = 4;

/**
 * Unified "what happened recently" feed, derived from the existing records
 * instead of a separate event table – nothing to keep in sync.
 */
export async function getActivity(): Promise<ActivityItem[]> {
  const [trips, notifications, wallets, websites, notes, completions] = await Promise.all([
    db.logbookEntry.findMany({ orderBy: { createdAt: "desc" }, take: PER_SOURCE }),
    db.notification.findMany({ orderBy: { createdAt: "desc" }, take: LIMIT - PER_SOURCE }),
    db.wallet.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    getWebsites(),
    db.note.findMany({ orderBy: { createdAt: "desc" }, take: PER_SOURCE }),
    db.routineCompletion.findMany({
      where: { outcome: "done" },
      orderBy: { doneAt: "desc" },
      take: PER_SOURCE,
      include: { routine: { select: { title: true } } },
    }),
  ]);

  const items: ActivityItem[] = [
    ...completions.map((c) => ({
      id: `routine:${c.id}`,
      kind: "routine" as const,
      title: `Done: ${c.routine.title}`,
      detail: null,
      at: c.doneAt.toISOString(),
      href: "/routines",
    })),
    ...notes.map((n) => ({
      id: `note:${n.id}`,
      kind: "note" as const,
      title: n.source === "app" ? "Captured a note" : `Note via ${n.source}`,
      detail: n.body.split("\n")[0].slice(0, 120),
      at: n.createdAt.toISOString(),
      href: `/inbox?note=${n.id}`,
    })),
    ...trips.map((t) => ({
      id: `trip:${t.id}`,
      kind: "trip" as const,
      title: `Logged ${formatKm(t.kilometers)}`,
      detail: t.description,
      at: t.createdAt.toISOString(),
      href: `/logbook?trip=${t.id}`,
    })),
    ...notifications.map((n) => ({
      id: `notification:${n.id}`,
      kind: "notification" as const,
      title: n.title,
      detail: null,
      at: n.createdAt.toISOString(),
      href: `/notifications?id=${n.id}`,
      severity: n.severity,
    })),
    ...wallets.map((w) => ({
      id: `wallet:${w.id}`,
      kind: "wallet" as const,
      title: `Added wallet ${w.label}`,
      detail: CHAIN_META[w.chain].label,
      at: w.createdAt.toISOString(),
      href: "/wallets",
    })),
    ...(websites.status === "ok"
      ? websites.websites
          .filter((w) => w.deployment.createdAt)
          .slice(0, PER_SOURCE)
          .map((w) => ({
            id: `deployment:${w.id}:${w.deployment.createdAt}`,
            kind: "deployment" as const,
            title: `Deployed ${w.name}`,
            detail: w.deployment.commitMessage,
            at: w.deployment.createdAt!,
            href: "/websites",
            severity: w.deployment.state === "error" ? ("error" as const) : undefined,
          }))
      : []),
  ];

  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, LIMIT);
}
