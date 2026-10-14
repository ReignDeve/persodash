import { authed, parseBody } from "@/lib/api/handler";
import { tryRequestSchema } from "@/lib/schemas/actions";
import { tryRequest } from "@/server/services/actions";

/** Playground: send a request without saving it. */
export const POST = authed(async (req) => tryRequest(await parseBody(req, tryRequestSchema)));
