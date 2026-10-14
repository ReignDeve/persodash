import { authed, parseBody } from "@/lib/api/handler";
import { flowInputSchema } from "@/lib/schemas/actions";
import { deleteFlow, updateFlow } from "@/server/services/actions";

type Params = { id: string };

export const PATCH = authed<Params>(async (req, { params }) => updateFlow(params.id, await parseBody(req, flowInputSchema)));

export const DELETE = authed<Params>(async (_req, { params }) => {
  await deleteFlow(params.id);
});
