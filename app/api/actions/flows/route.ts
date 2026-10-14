import { authed, parseBody } from "@/lib/api/handler";
import { flowInputSchema } from "@/lib/schemas/actions";
import { createFlow } from "@/server/services/actions";

export const POST = authed(async (req) => createFlow(await parseBody(req, flowInputSchema)));
