import { authed, parseBody } from "@/lib/api/handler";
import { env } from "@/lib/env";
import { settingsUpdateSchema, type SettingsResponse } from "@/lib/schemas/settings";
import { listSessions } from "@/server/services/auth";
import { getInternal, getSettings, updateSettings } from "@/server/services/settings";
import { getIntegrations } from "@/server/services/system";

export const GET = authed(async (_req, { user }): Promise<SettingsResponse> => {
  const [settings, sessions, lastMinerRun, lastSummaryDate] = await Promise.all([
    getSettings(),
    listSessions(user),
    getInternal<string>("scheduler:lastMinerRun"),
    getInternal<string>("scheduler:lastSummaryDate"),
  ]);
  return {
    user: { username: user.username },
    settings,
    integrations: getIntegrations(),
    sessions,
    scheduler: { enabled: env().SCHEDULER_ENABLED, lastMinerRun, lastSummaryDate },
  };
});

export const PATCH = authed(async (req) => updateSettings(await parseBody(req, settingsUpdateSchema)));
