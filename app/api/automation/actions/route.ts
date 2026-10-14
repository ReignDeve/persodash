import { z } from "zod";

import { parseBody } from "@/lib/api/handler";
import { withToken } from "@/lib/api/token-auth";
import { runByName } from "@/server/services/actions";

const bodySchema = z.object({ name: z.string().trim().min(1).max(80) });

/** Run a saved action or flow by name: { "name": "deploy check" } */
export const POST = withToken("actions", async (req, token) => {
  const { name } = await parseBody(req, bodySchema);
  return runByName(name, `api:${token.name}`);
});
