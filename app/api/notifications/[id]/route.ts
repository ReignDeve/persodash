import { authed, parseBody } from "@/lib/api/handler";
import { notificationUpdateSchema } from "@/lib/schemas/notifications";
import { deleteNotification, setRead } from "@/server/services/notifications";

type Params = { id: string };

export const PATCH = authed<Params>(async (req, { params }) => {
  const { read } = await parseBody(req, notificationUpdateSchema);
  return setRead(params.id, read);
});

export const DELETE = authed<Params>(async (_req, { params }) => {
  await deleteNotification(params.id);
});
