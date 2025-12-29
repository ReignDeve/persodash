// app/services/notificationsService.ts

export type NotificationType = "website" | "miner" | "wallet" | "system";
export type NotificationSeverity = "info" | "warning" | "error";

export interface Notification {
  id: string;
  type: NotificationType;
  source: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  createdAt: string; // ISO-String
}

// *** SIMPLE IN-MEMORY STORE ***
// -> For Demo/Dev. On prod: DB (Postgres/SQLite/Prisma etc.)
const notifications: Notification[] = [];

export function addNotification(
  input: Omit<Notification, "id" | "createdAt">
): Notification {
  const notification: Notification = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };

  notifications.unshift(notification); // Newest first
  return notification;
}

export function listNotifications(): Notification[] {
  return notifications;
}

export function listNotificationsForToday(): Notification[] {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();

  return notifications.filter((n) => {
    const t = new Date(n.createdAt);
    return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d;
  });
}
