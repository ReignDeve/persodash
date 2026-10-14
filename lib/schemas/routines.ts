import { z } from "zod";

export const CADENCES = ["daily", "weekly", "monthly", "quarterly", "yearly"] as const;
export type Cadence = (typeof CADENCES)[number];

const UNIT: Record<Cadence, [string, string]> = {
  daily: ["day", "days"],
  weekly: ["week", "weeks"],
  monthly: ["month", "months"],
  quarterly: ["quarter", "quarters"],
  yearly: ["year", "years"],
};

export const CADENCE_LABEL: Record<Cadence, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

/** "Every month", "Every 2 weeks" */
export function cadenceLabel(cadence: Cadence, interval: number) {
  const [one, many] = UNIT[cadence];
  return interval === 1 ? `Every ${one}` : `Every ${interval} ${many}`;
}

export const routineInputSchema = z.object({
  title: z.string().trim().min(1, "What needs doing?").max(120),
  notes: z
    .string()
    .trim()
    .max(1000)
    .nullish()
    .transform((v) => (v ? v : null)),
  cadence: z.enum(CADENCES),
  interval: z.coerce.number().int().min(1, "At least 1").max(52),
  nextDue: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  remind: z.boolean().default(true),
  active: z.boolean().default(true),
  projectId: z
    .string()
    .nullish()
    .transform((v) => (v ? v : null)),
});

export type RoutineInput = z.infer<typeof routineInputSchema>;
export type RoutineFormValues = z.input<typeof routineInputSchema>;

export const routineActionSchema = z.object({
  action: z.enum(["done", "skip", "snooze"]),
  /** Snooze length in days. */
  days: z.coerce.number().int().min(1).max(30).optional(),
});

export type RoutineAction = z.infer<typeof routineActionSchema>;

export type RoutineBucket = "overdue" | "today" | "week" | "later" | "paused";

export type RoutineItem = {
  id: string;
  title: string;
  notes: string | null;
  cadence: Cadence;
  interval: number;
  nextDue: string; // YYYY-MM-DD
  daysUntilDue: number;
  bucket: RoutineBucket;
  remind: boolean;
  active: boolean;
  project: { id: string; name: string } | null;
  lastDoneAt: string | null;
  /** Consecutive on-time completions. */
  streak: number;
  /** Outcomes of the last 8 cycles, oldest first. */
  history: ("done" | "late" | "skipped")[];
};

export type RoutinesResponse = {
  items: RoutineItem[];
  counts: Record<RoutineBucket, number>;
};

/** Starting points – one click creates a real routine. */
export const ROUTINE_TEMPLATES: { title: string; cadence: Cadence; interval: number; notes?: string }[] = [
  { title: "Export the logbook for tax records", cadence: "monthly", interval: 1, notes: "Logbook → Export CSV" },
  { title: "Check VPS backups", cadence: "weekly", interval: 1, notes: "Restore one file to be sure" },
  { title: "Update server packages", cadence: "monthly", interval: 1 },
  { title: "Review subscriptions", cadence: "quarterly", interval: 1, notes: "Cancel what you don't use" },
  { title: "Clear the inbox", cadence: "weekly", interval: 1 },
  { title: "Rotate API tokens and passwords", cadence: "yearly", interval: 1 },
];
