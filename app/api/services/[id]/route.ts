import { authed, parseBody } from "@/lib/api/handler";
import { monitorInputSchema } from "@/lib/schemas/services";
import { deleteMonitor, updateMonitor } from "@/server/services/services";

type Params = { id: string };

export const PATCH = authed<Params>(async (req, { params }) =>
  updateMonitor(params.id, await parseBody(req, monitorInputSchema)),
);

export const DELETE = authed<Params>(async (_req, { params }) => {
  await deleteMonitor(params.id);
});
