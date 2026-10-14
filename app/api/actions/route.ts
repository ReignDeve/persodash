import { authed, parseBody } from "@/lib/api/handler";
import { actionInputSchema } from "@/lib/schemas/actions";
import { createAction, listActions } from "@/server/services/actions";

export const GET = authed(async () => listActions());

export const POST = authed(async (req) => createAction(await parseBody(req, actionInputSchema)));
