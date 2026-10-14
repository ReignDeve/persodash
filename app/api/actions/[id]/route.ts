import { authed, parseBody } from "@/lib/api/handler";
import { actionInputSchema } from "@/lib/schemas/actions";
import { deleteAction, updateAction } from "@/server/services/actions";

type Params = { id: string };

export const PATCH = authed<Params>(async (req, { params }) => updateAction(params.id, await parseBody(req, actionInputSchema)));

export const DELETE = authed<Params>(async (_req, { params }) => {
  await deleteAction(params.id);
});
