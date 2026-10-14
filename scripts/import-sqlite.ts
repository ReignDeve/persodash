/**
 * One-off migration of the old SQLite logbook into PostgreSQL.
 *
 *   npm run db:import-sqlite -- ./dev.db
 *
 * Idempotent: entries are upserted by id, so running it twice is harmless.
 */
import "dotenv/config";

import { DatabaseSync } from "node:sqlite";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../app/generated/prisma/client";

type Row = {
  id: string;
  date: string | number;
  kilometers: number;
  description: string;
  type: string;
  createdAt: string | number;
};

const file = process.argv[2] ?? "./dev.db";
// Built into Node 22 – no native dependency needed for this one-off import.
const sqlite = new DatabaseSync(file, { readOnly: true });
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function toDate(value: string | number) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${value}`);
  return d;
}

async function main() {
  const tables = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all() as unknown as { name: string }[];
  const table = tables.some((t) => t.name === "logbook_entries") ? "logbook_entries" : "trips";
  const rows = sqlite.prepare(`SELECT * FROM ${table}`).all() as unknown as Row[];

  let imported = 0;
  let skipped = 0;
  for (const row of rows) {
    if (row.type !== "business" && row.type !== "private") {
      skipped++;
      continue;
    }
    const date = toDate(row.date);
    const data = {
      // Keep only the calendar day.
      date: new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`),
      kilometers: Math.round(Number(row.kilometers)),
      description: String(row.description).trim(),
      type: row.type,
      createdAt: toDate(row.createdAt),
    } as const;
    await prisma.logbookEntry.upsert({ where: { id: row.id }, create: { id: row.id, ...data }, update: data });
    imported++;
  }

  console.log(`Imported ${imported} trips from ${file} (${table}); skipped ${skipped} invalid rows.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    sqlite.close();
    await prisma.$disconnect();
  });
