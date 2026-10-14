import { z } from "zod";

import { authed, parseQuery } from "@/lib/api/handler";
import { search } from "@/server/services/search";

const querySchema = z.object({ q: z.string().max(100).default("") });

export const GET = authed(async (req) => {
  const { q } = parseQuery(req, querySchema);
  return { results: await search(q) };
});
