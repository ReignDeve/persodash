import "server-only";

import { db } from "@/lib/db";
import { Prisma } from "@/app/generated/prisma/client";
import {
  minerSettingsSchema,
  notificationSettingsSchema,
  type AppSettings,
} from "@/lib/schemas/settings";

/** Defaults for user-editable settings. Stored values are merged on top. */
export const DEFAULT_SETTINGS: AppSettings = {
  miner: { minHashrate: 1_000_000, inactiveMinutes: 10 },
  notifications: { telegramEnabled: true, dailySummaryEnabled: true, dailySummaryHour: 20, weeklyReviewEnabled: true },
};

const SECTION_SCHEMAS = {
  miner: minerSettingsSchema,
  notifications: notificationSettingsSchema,
} as const;

type Section = keyof AppSettings;

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.setting.findMany({ where: { key: { in: Object.keys(SECTION_SCHEMAS) } } });
  const result = structuredClone(DEFAULT_SETTINGS);

  for (const row of rows) {
    const key = row.key as Section;
    const parsed = SECTION_SCHEMAS[key]
      .partial()
      .safeParse(row.value);
    if (parsed.success) Object.assign(result[key], parsed.data);
  }
  return result;
}

export async function updateSettings(patch: Partial<AppSettings>) {
  await db.$transaction(
    (Object.entries(patch) as [Section, AppSettings[Section]][])
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) =>
        db.setting.upsert({
          where: { key },
          create: { key, value: value as Prisma.InputJsonValue },
          update: { value: value as Prisma.InputJsonValue },
        }),
      ),
  );
  return getSettings();
}

// Internal bookkeeping values (scheduler state etc.) share the same table.

export async function getInternal<T>(key: string): Promise<T | null> {
  const row = await db.setting.findUnique({ where: { key: `internal:${key}` } });
  return (row?.value as T) ?? null;
}

export async function setInternal(key: string, value: Prisma.InputJsonValue) {
  await db.setting.upsert({
    where: { key: `internal:${key}` },
    create: { key: `internal:${key}`, value },
    update: { value },
  });
}
