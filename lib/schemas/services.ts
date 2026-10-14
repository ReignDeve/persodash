import { z } from "zod";

export const monitorInputSchema = z.object({
  name: z.string().trim().min(1, "Give the service a name").max(60),
  url: z
    .string()
    .trim()
    .max(300)
    .refine((v) => /^https?:\/\/[^\s]+$/.test(v), "Enter a full URL starting with http:// or https://"),
  expectedStatus: z
    .union([z.literal(""), z.coerce.number().int().min(100).max(599)])
    .nullish()
    .transform((v) => (v === "" || v === undefined || v === null ? null : v)),
  projectId: z
    .string()
    .nullish()
    .transform((v) => (v ? v : null)),
  enabled: z.boolean().default(true),
});

export type MonitorInput = z.infer<typeof monitorInputSchema>;
export type MonitorFormValues = z.input<typeof monitorInputSchema>;

export type UptimeDay = {
  day: string; // YYYY-MM-DD
  checks: number;
  failures: number;
};

export type MonitorSummary = {
  id: string;
  name: string;
  url: string;
  expectedStatus: number | null;
  enabled: boolean;
  project: { id: string; name: string } | null;
  state: "up" | "down" | "pending" | "paused";
  lastCheck: { at: string; statusCode: number | null; latencyMs: number | null; error: string | null } | null;
  /** Status changes since `since` – how long it has been up/down. */
  since: string | null;
  uptime24h: number | null;
  uptime30d: number | null;
  avgLatency24h: number | null;
  /** Oldest first, one entry per day for the last 30 days. */
  days: UptimeDay[];
  /** Latency of the last 24h of checks, oldest first. */
  latency: { t: string; ms: number | null }[];
};

export type ServicesResponse = { monitors: MonitorSummary[]; intervalMinutes: number };
