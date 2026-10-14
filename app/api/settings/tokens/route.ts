import { authed, parseBody } from "@/lib/api/handler";
import { tokenInputSchema } from "@/lib/schemas/automation";
import { createToken, listTokens } from "@/server/services/tokens";

export const GET = authed(async () => ({ tokens: await listTokens() }));

export const POST = authed(async (req) => createToken(await parseBody(req, tokenInputSchema)));
