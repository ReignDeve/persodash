import { z } from "zod";

export const NOTIFICATION_CATEGORIES = ["website", "miner", "wallet", "service", "subscription", "routine", "system"] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  website: "Websites",
  miner: "Miner",
  wallet: "Wallets",
  service: "Services",
  subscription: "Subscriptions",
  routine: "Routines",
  system: "System",
};

export const SEVERITIES = ["info", "warning", "error"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const notificationInputSchema = z.object({
  category: z.enum(NOTIFICATION_CATEGORIES),
  severity: z.enum(SEVERITIES),
  title: z.string().trim().min(1).max(140),
  message: z.string().trim().min(1).max(4000),
  source: z.string().trim().min(1).max(200),
});

export type NotificationInput = z.infer<typeof notificationInputSchema>;

export const notificationFilterSchema = z.object({
  status: z.enum(["all", "unread"]).default("all"),
  category: z.enum(NOTIFICATION_CATEGORIES).optional(),
});

export const notificationBulkSchema = z.object({
  action: z.enum(["read-all", "clear-read"]),
});

export const notificationUpdateSchema = z.object({ read: z.boolean() });

export type NotificationItem = {
  id: string;
  category: NotificationCategory;
  severity: Severity;
  title: string;
  message: string;
  source: string;
  read: boolean;
  createdAt: string;
};

export type NotificationsResponse = { items: NotificationItem[]; unread: number };
