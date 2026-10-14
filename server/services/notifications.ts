import "server-only";

import { db } from "@/lib/db";
import type { Notification } from "@/app/generated/prisma/client";
import type {
  NotificationCategory,
  NotificationInput,
  NotificationItem,
  NotificationsResponse,
} from "@/lib/schemas/notifications";
import { escapeTelegram, sendTelegram } from "@/server/integrations/telegram";
import { getSettings } from "@/server/services/settings";

const LIST_LIMIT = 200;
const SEVERITY_ICON = { info: "ℹ️", warning: "⚠️", error: "⛔" } as const;

function toItem(n: Notification): NotificationItem {
  return {
    id: n.id,
    category: n.category,
    severity: n.severity,
    title: n.title,
    message: n.message,
    source: n.source,
    read: n.readAt !== null,
    createdAt: n.createdAt.toISOString(),
  };
}

export async function listNotifications(filter: {
  status?: "all" | "unread";
  category?: NotificationCategory;
}): Promise<NotificationsResponse> {
  const [items, unread] = await Promise.all([
    db.notification.findMany({
      where: {
        ...(filter.status === "unread" ? { readAt: null } : {}),
        ...(filter.category ? { category: filter.category } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: LIST_LIMIT,
    }),
    db.notification.count({ where: { readAt: null } }),
  ]);
  return { items: items.map(toItem), unread };
}

export function countUnread() {
  return db.notification.count({ where: { readAt: null } });
}

/**
 * Stores a notification and, unless disabled, forwards it to Telegram.
 * This is the single entry point for alerts from monitors and integrations.
 */
export async function notify(input: NotificationInput, opts: { push?: boolean } = {}) {
  const notification = await db.notification.create({ data: input });

  if (opts.push !== false) {
    const { notifications } = await getSettings();
    if (notifications.telegramEnabled) {
      await sendTelegram(
        [
          `${SEVERITY_ICON[input.severity]} <b>${escapeTelegram(input.title)}</b>`,
          "",
          escapeTelegram(input.message),
        ].join("\n"),
      );
    }
  }

  return toItem(notification);
}

export async function setRead(id: string, read: boolean) {
  const n = await db.notification.update({
    where: { id },
    data: { readAt: read ? new Date() : null },
  });
  return toItem(n);
}

export async function markAllRead() {
  const { count } = await db.notification.updateMany({
    where: { readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: count };
}

export async function clearRead() {
  const { count } = await db.notification.deleteMany({ where: { readAt: { not: null } } });
  return { deleted: count };
}

export async function deleteNotification(id: string) {
  await db.notification.delete({ where: { id } });
}

export async function countSince(since: Date) {
  const rows = await db.notification.groupBy({
    by: ["severity"],
    where: { createdAt: { gte: since } },
    _count: true,
  });
  return Object.fromEntries(rows.map((r) => [r.severity, r._count])) as Partial<
    Record<NotificationItem["severity"], number>
  >;
}

// ---------------------------------------------------------------------------
// Alert state: notify on transitions (ok → failing, failing → ok), not on every poll.
// ---------------------------------------------------------------------------

export async function transitionAlert(
  key: string,
  failing: boolean,
): Promise<"raised" | "resolved" | "unchanged"> {
  const current = await db.alertState.findUnique({ where: { key } });
  const wasFailing = current?.active ?? false;
  if (wasFailing === failing) return "unchanged";

  await db.alertState.upsert({
    where: { key },
    create: { key, active: failing, since: new Date() },
    update: { active: failing, since: new Date() },
  });
  return failing ? "raised" : "resolved";
}
