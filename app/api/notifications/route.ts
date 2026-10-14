import { authed, parseBody, parseQuery } from "@/lib/api/handler";
import {
  notificationBulkSchema,
  notificationFilterSchema,
  notificationInputSchema,
} from "@/lib/schemas/notifications";
import {
  clearRead,
  listNotifications,
  markAllRead,
  notify,
} from "@/server/services/notifications";

export const GET = authed(async (req) => listNotifications(parseQuery(req, notificationFilterSchema)));

/** Lets future integrations (LUCY, automations, scripts) raise notifications. */
export const POST = authed(async (req) => notify(await parseBody(req, notificationInputSchema)));

export const PATCH = authed(async (req) => {
  const { action } = await parseBody(req, notificationBulkSchema);
  return action === "read-all" ? markAllRead() : clearRead();
});
