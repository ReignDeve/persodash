import { parseBody } from "@/lib/api/handler";
import { withToken } from "@/lib/api/token-auth";
import { automationNotificationSchema } from "@/lib/schemas/automation";
import { notify } from "@/server/services/notifications";

/** Raise an alert from outside: { title, message, severity?, category? } */
export const POST = withToken("notifications", async (req, token) => {
  const input = await parseBody(req, automationNotificationSchema);
  const item = await notify({ ...input, source: `token:${token.name}` });
  return { ok: true, id: item.id };
});
