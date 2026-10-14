import { authed, parseBody } from "@/lib/api/handler";
import { routineInputSchema } from "@/lib/schemas/routines";
import { deleteRoutine, updateRoutine } from "@/server/services/routines";

type Params = { id: string };

export const PATCH = authed<Params>(async (req, { params }) =>
  updateRoutine(params.id, await parseBody(req, routineInputSchema)),
);

export const DELETE = authed<Params>(async (_req, { params }) => {
  await deleteRoutine(params.id);
});
