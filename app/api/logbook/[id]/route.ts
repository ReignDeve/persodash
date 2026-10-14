import { authed, parseBody } from "@/lib/api/handler";
import { tripInputSchema } from "@/lib/schemas/logbook";
import { deleteTrip, updateTrip } from "@/server/services/logbook";

type Params = { id: string };

export const PATCH = authed<Params>(async (req, { params }) => {
  return updateTrip(params.id, await parseBody(req, tripInputSchema));
});

export const DELETE = authed<Params>(async (_req, { params }) => {
  await deleteTrip(params.id);
});
