import { z } from "zod";

export const BILLING_CYCLES = ["monthly", "quarterly", "yearly"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const CYCLE_LABEL: Record<BillingCycle, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export const CYCLE_MONTHS: Record<BillingCycle, number> = { monthly: 1, quarterly: 3, yearly: 12 };

export const CURRENCIES = ["EUR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Suggested categories; free text is allowed. */
export const SUBSCRIPTION_CATEGORIES = ["Hosting", "Domain", "Software", "AI", "Media", "Other"] as const;

export const subscriptionInputSchema = z.object({
  name: z.string().trim().min(1, "Name the subscription").max(80),
  /** Price in major units (e.g. 12.99). Converted to cents by the service only –
   *  a transform here would run twice (client resolver + server parse). */
  amount: z.coerce.number({ error: "Enter a price" }).min(0, "Price can't be negative").max(100_000),
  currency: z.enum(CURRENCIES),
  cycle: z.enum(BILLING_CYCLES),
  nextRenewal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  category: z
    .string()
    .trim()
    .max(40)
    .nullish()
    .transform((v) => (v ? v : null)),
  remindDays: z.coerce.number().int().min(0).max(60),
  url: z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^https?:\/\//.test(v), "Must start with http:// or https://"),
  projectId: z
    .string()
    .nullish()
    .transform((v) => (v ? v : null)),
  active: z.boolean().default(true),
});

export type SubscriptionInput = z.infer<typeof subscriptionInputSchema>;
export type SubscriptionFormValues = z.input<typeof subscriptionInputSchema>;

export type SubscriptionItem = {
  id: string;
  name: string;
  amountCents: number;
  currency: Currency;
  cycle: BillingCycle;
  nextRenewal: string; // YYYY-MM-DD
  daysUntilRenewal: number;
  category: string | null;
  remindDays: number;
  active: boolean;
  url: string | null;
  project: { id: string; name: string } | null;
  monthlyEur: number | null;
  yearlyEur: number | null;
};

export type SubscriptionsResponse = {
  items: SubscriptionItem[];
  totals: {
    monthlyEur: number;
    yearlyEur: number;
    next30DaysEur: number;
    byCategory: { category: string; monthlyEur: number }[];
  };
  usdToEur: number | null;
};
