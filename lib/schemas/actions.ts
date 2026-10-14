import { z } from "zod";

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export const BODY_LIMIT = 100_000;

/** A header as edited in the UI. For stored secrets the client never sees the value: `value` is null + `hasValue`. */
export const headerSchema = z.object({
  key: z.string().trim().max(200),
  value: z.string().max(8000).nullable(),
  secret: z.boolean().default(false),
});

export type HeaderInput = z.infer<typeof headerSchema>;

const urlSchema = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => /^https?:\/\/[^\s]+$/.test(v), "Enter a full URL starting with http:// or https://");

/** The request itself – shared by "try" (unsaved) and saved actions. */
export const requestSchema = z.object({
  method: z.enum(HTTP_METHODS),
  url: urlSchema,
  headers: z.array(headerSchema).max(30).default([]),
  body: z
    .string()
    .max(BODY_LIMIT)
    .nullish()
    .transform((v) => (v ? v : null)),
  expectedStatus: z
    .union([z.literal(""), z.null(), z.coerce.number().int().min(100).max(599)])
    .optional()
    .transform((v) => (v === "" || v === undefined || v === null ? null : v)),
});

export type RequestInput = z.infer<typeof requestSchema>;

export const actionInputSchema = requestSchema.extend({
  name: z.string().trim().min(1, "Name the action").max(80),
  projectId: z
    .string()
    .nullish()
    .transform((v) => (v ? v : null)),
});

export type ActionInput = z.infer<typeof actionInputSchema>;

/** Unsaved request; `actionId` lets the server fill in stored secret header values. */
export const tryRequestSchema = requestSchema.extend({ actionId: z.string().optional() });

export const flowInputSchema = z.object({
  name: z.string().trim().min(1, "Name the flow").max(80),
  steps: z.array(z.string().min(1)).min(1, "Add at least one action").max(20),
  stopOnFailure: z.boolean().default(true),
});

export type FlowInput = z.infer<typeof flowInputSchema>;

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export type HeaderItem = { key: string; value: string | null; secret: boolean; hasValue: boolean };

export type RunSummary = {
  id: string;
  ok: boolean;
  status: number | null;
  durationMs: number | null;
  error: string | null;
  trigger: string;
  startedAt: string;
};

export type ActionItem = {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: HeaderItem[];
  body: string | null;
  expectedStatus: number | null;
  project: { id: string; name: string } | null;
  lastRun: RunSummary | null;
  /** Oldest first. */
  recentRuns: RunSummary[];
  updatedAt: string;
};

export type FlowItem = {
  id: string;
  name: string;
  steps: { id: string; name: string; method: HttpMethod; missing: boolean }[];
  stopOnFailure: boolean;
  lastRun: RunSummary | null;
};

export type ActionsResponse = { actions: ActionItem[]; flows: FlowItem[]; secretsConfigured: boolean };

export type ExecutionResult = {
  ok: boolean;
  status: number | null;
  statusText: string | null;
  durationMs: number;
  /** Response size in bytes (before truncation). */
  size: number | null;
  contentType: string | null;
  headers: [string, string][];
  body: string | null;
  truncated: boolean;
  error: string | null;
};

export type FlowRunResult = {
  ok: boolean;
  durationMs: number;
  steps: { actionId: string; name: string; skipped: boolean; result: ExecutionResult | null }[];
};
