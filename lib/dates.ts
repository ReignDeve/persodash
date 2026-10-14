import { addDays, addMonths, addWeeks, addYears, format } from "date-fns";

// Calendar-day helpers. Date-only values (Postgres `date`) are represented as
// UTC midnight; "today" follows the server's local timezone (TZ in Docker).

const DAY_MS = 24 * 60 * 60 * 1000;

export const toDateOnly = (d: Date) => d.toISOString().slice(0, 10);
export const fromDateOnly = (s: string) => new Date(`${s}T00:00:00.000Z`);
export const todayDateOnly = () => format(new Date(), "yyyy-MM-dd");
export const today = () => fromDateOnly(todayDateOnly());
export const daysBetween = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / DAY_MS);

export type Step = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

/** Adds `n` cadence steps to a date-only value. */
export function addSteps(date: Date, step: Step, n: number) {
  const next =
    step === "daily"
      ? addDays(date, n)
      : step === "weekly"
        ? addWeeks(date, n)
        : step === "monthly"
          ? addMonths(date, n)
          : step === "quarterly"
            ? addMonths(date, 3 * n)
            : addYears(date, n);
  return fromDateOnly(toDateOnly(next));
}
