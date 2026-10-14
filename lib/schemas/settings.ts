import { z } from "zod";

export const minerSettingsSchema = z.object({
  minHashrate: z.coerce.number().min(0, "Must be 0 or more"),
  inactiveMinutes: z.coerce.number().int().min(1).max(1440),
});

export const notificationSettingsSchema = z.object({
  telegramEnabled: z.boolean(),
  dailySummaryEnabled: z.boolean(),
  dailySummaryHour: z.coerce.number().int().min(0).max(23),
  weeklyReviewEnabled: z.boolean(),
});

export const settingsUpdateSchema = z.object({
  miner: minerSettingsSchema.optional(),
  notifications: notificationSettingsSchema.optional(),
});

export type MinerSettings = z.infer<typeof minerSettingsSchema>;
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type AppSettings = { miner: MinerSettings; notifications: NotificationSettings };

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(12, "Use at least 12 characters").max(200),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Enter your username").max(100),
  password: z.string().min(1, "Enter your password").max(200),
});

export type LoginValues = z.infer<typeof loginSchema>;

export type IntegrationStatus = {
  key: string;
  name: string;
  description: string;
  configured: boolean;
  envVars: string[];
};

export type SessionInfo = {
  id: string;
  current: boolean;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastSeenAt: string;
};

export type SettingsResponse = {
  user: { username: string };
  settings: AppSettings;
  integrations: IntegrationStatus[];
  sessions: SessionInfo[];
  scheduler: { enabled: boolean; lastMinerRun: string | null; lastSummaryDate: string | null };
};
