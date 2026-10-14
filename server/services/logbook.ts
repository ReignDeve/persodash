import "server-only";

import { addMonths, format, startOfMonth } from "date-fns";

import { db } from "@/lib/db";
import type { LogbookEntry } from "@/app/generated/prisma/client";
import type { LogbookSummary, MonthlyDistance, Trip, TripInput } from "@/lib/schemas/logbook";

const MONTHS_IN_CHART = 12;

/** `@db.Date` columns come back as UTC midnight; keep them as plain dates. */
const toDateOnly = (d: Date) => d.toISOString().slice(0, 10);
const fromDateOnly = (s: string) => new Date(`${s}T00:00:00.000Z`);

export function toTrip(entry: LogbookEntry): Trip {
  return {
    id: entry.id,
    date: toDateOnly(entry.date),
    kilometers: entry.kilometers,
    description: entry.description,
    type: entry.type,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export async function listTrips(filter: { year?: number } = {}): Promise<Trip[]> {
  const where = filter.year
    ? { date: { gte: fromDateOnly(`${filter.year}-01-01`), lt: fromDateOnly(`${filter.year + 1}-01-01`) } }
    : {};
  const entries = await db.logbookEntry.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return entries.map(toTrip);
}

export async function createTrip(input: TripInput) {
  const entry = await db.logbookEntry.create({
    data: { ...input, date: fromDateOnly(input.date) },
  });
  return toTrip(entry);
}

export async function updateTrip(id: string, input: TripInput) {
  const entry = await db.logbookEntry.update({
    where: { id },
    data: { ...input, date: fromDateOnly(input.date) },
  });
  return toTrip(entry);
}

export async function deleteTrip(id: string) {
  await db.logbookEntry.delete({ where: { id } });
}

export async function getLogbookSummary(): Promise<LogbookSummary> {
  const now = new Date();
  const thisMonth = startOfMonth(now);
  const chartStart = addMonths(thisMonth, -(MONTHS_IN_CHART - 1));

  const [totals, business, recent, yearRows] = await Promise.all([
    db.logbookEntry.aggregate({ _count: true, _sum: { kilometers: true } }),
    db.logbookEntry.aggregate({ _sum: { kilometers: true }, where: { type: "business" } }),
    db.logbookEntry.findMany({
      where: { date: { gte: fromDateOnly(format(chartStart, "yyyy-MM-dd")) } },
      select: { date: true, kilometers: true, type: true },
    }),
    db.$queryRaw<{ year: number }[]>`
      SELECT DISTINCT EXTRACT(YEAR FROM "date")::int AS year
      FROM logbook_entries ORDER BY year DESC`,
  ]);

  const monthly: MonthlyDistance[] = Array.from({ length: MONTHS_IN_CHART }, (_, i) => ({
    month: format(addMonths(chartStart, i), "yyyy-MM"),
    business: 0,
    private: 0,
  }));
  const byMonth = new Map(monthly.map((m) => [m.month, m]));

  for (const row of recent) {
    const bucket = byMonth.get(toDateOnly(row.date).slice(0, 7));
    if (bucket) bucket[row.type] += row.kilometers;
  }

  const sumOf = (m?: MonthlyDistance) => (m ? m.business + m.private : 0);

  return {
    totalTrips: totals._count,
    totalKilometers: totals._sum.kilometers ?? 0,
    businessKilometers: business._sum.kilometers ?? 0,
    thisMonthKilometers: sumOf(monthly.at(-1)),
    lastMonthKilometers: sumOf(monthly.at(-2)),
    monthly,
    years: yearRows.map((r) => r.year),
  };
}

const CSV_HEADER = ["Date", "Type", "Kilometers", "Description"];

function csvCell(value: string | number) {
  const s = String(value);
  // Quote everything that needs it and neutralise spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function tripsToCsv(trips: Trip[]) {
  const rows = trips.map((t) => [t.date, t.type, t.kilometers, t.description].map(csvCell).join(","));
  return [CSV_HEADER.join(","), ...rows].join("\n");
}
