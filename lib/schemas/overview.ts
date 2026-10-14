import type { Severity } from "@/lib/schemas/notifications";

export const SEARCH_GROUPS = ["Inbox", "Routines", "Actions", "Projects", "Services", "Subscriptions", "Trips", "Websites", "Wallets", "Notifications"] as const;
export type SearchGroup = (typeof SEARCH_GROUPS)[number];

export type SearchResult = {
  id: string;
  group: SearchGroup;
  title: string;
  subtitle?: string;
  href: string;
  external?: boolean;
};

export type ActivityItem = {
  id: string;
  kind: "trip" | "deployment" | "notification" | "wallet" | "note" | "routine";
  title: string;
  detail: string | null;
  at: string;
  href: string;
  severity?: Severity;
};

export type SystemStatus = {
  hostname: string;
  platform: string;
  uptimeSeconds: number;
  load: [number, number, number];
  cpuCount: number;
  memory: { total: number; used: number };
  disk: { total: number; used: number } | null;
  database: { ok: boolean; latencyMs: number | null };
  nodeVersion: string;
};
