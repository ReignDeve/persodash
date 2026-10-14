import { z } from "zod";

export const TRIP_TYPES = ["business", "private"] as const;
export type TripType = (typeof TRIP_TYPES)[number];

export const TRIP_TYPE_LABEL: Record<TripType, string> = {
  business: "Business",
  private: "Private",
};

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date");

export const tripInputSchema = z.object({
  date: isoDate,
  kilometers: z.coerce
    .number({ error: "Enter a distance" })
    .int("Whole kilometres only")
    .positive("Distance must be greater than 0")
    .max(5000, "That looks too far for one trip"),
  description: z.string().trim().min(1, "Describe the trip").max(200),
  type: z.enum(TRIP_TYPES),
});

export type TripInput = z.infer<typeof tripInputSchema>;
export type TripFormValues = z.input<typeof tripInputSchema>;

export const tripFilterSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export type Trip = {
  id: string;
  date: string; // YYYY-MM-DD
  kilometers: number;
  description: string;
  type: TripType;
  createdAt: string;
  updatedAt: string;
};

export type MonthlyDistance = { month: string; business: number; private: number };

export type LogbookSummary = {
  totalTrips: number;
  totalKilometers: number;
  businessKilometers: number;
  thisMonthKilometers: number;
  lastMonthKilometers: number;
  /** Last 12 months including the current one, oldest first. Month = YYYY-MM. */
  monthly: MonthlyDistance[];
  years: number[];
};

export type LogbookResponse = { trips: Trip[]; summary: LogbookSummary };
