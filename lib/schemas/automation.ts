import { z } from "zod";

import { NOTE_MAX_LENGTH } from "@/lib/schemas/notes";
import { NOTIFICATION_CATEGORIES, SEVERITIES } from "@/lib/schemas/notifications";
import { TRIP_TYPES } from "@/lib/schemas/logbook";

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

export const TOKEN_SCOPES = ["read", "notes", "trips", "routines", "actions", "notifications"] as const;
export type TokenScope = (typeof TOKEN_SCOPES)[number];

export const SCOPE_INFO: Record<TokenScope, { label: string; description: string }> = {
  read: { label: "Read status", description: "GET /api/automation/summary – what needs attention, key figures" },
  notes: { label: "Capture notes", description: "POST /api/automation/notes – add to the inbox" },
  trips: { label: "Log trips", description: "POST /api/automation/trips – e.g. from an iOS Shortcut" },
  routines: { label: "Complete routines", description: "POST /api/automation/routines – mark a routine as done" },
  actions: { label: "Run actions", description: "POST /api/automation/actions – run a saved action or flow by name" },
  notifications: { label: "Send alerts", description: "POST /api/automation/notifications – push alerts from scripts" },
};

export const tokenInputSchema = z.object({
  name: z.string().trim().min(1, "Name the token, e.g. “LUCY” or “iPhone Shortcuts”").max(60),
  scopes: z.array(z.enum(TOKEN_SCOPES)).min(1, "Pick at least one permission"),
});

export type TokenInput = z.infer<typeof tokenInputSchema>;

export type TokenItem = {
  id: string;
  name: string;
  prefix: string;
  scopes: TokenScope[];
  lastUsedAt: string | null;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Automation payloads – deliberately forgiving for voice/shortcut input
// ---------------------------------------------------------------------------

export const automationNoteSchema = z.object({
  text: z.string().trim().min(1).max(NOTE_MAX_LENGTH),
  /** Project name (case-insensitive) – optional. */
  project: z.string().trim().max(80).optional(),
});

export const automationTripSchema = z
  .object({
    /** Matched against earlier trips to fill in distance and type. */
    description: z.string().trim().min(1).max(200),
    kilometers: z.coerce.number().int().positive().max(5000).optional(),
    type: z.enum(TRIP_TYPES).optional(),
    /** YYYY-MM-DD, defaults to today. */
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .strict();

export const automationNotificationSchema = z.object({
  title: z.string().trim().min(1).max(140),
  message: z.string().trim().min(1).max(4000),
  severity: z.enum(SEVERITIES).default("info"),
  category: z.enum(NOTIFICATION_CATEGORIES).default("system"),
});

export type AttentionItem = { tone: "err" | "warn"; title: string; detail: string | null };

/** Compact, voice-friendly status for LUCY and other clients. */
export type AutomationSummary = {
  generatedAt: string;
  headline: string;
  attention: AttentionItem[];
  inbox: { open: number };
  routinesDue: { title: string; overdueDays: number }[];
  focus: { project: string; nextStep: string }[];
  upcomingRenewals: { name: string; date: string; inDays: number; amount: string }[];
  logbook: { thisMonthKm: number };
  portfolio: { totalEur: number | null };
};
