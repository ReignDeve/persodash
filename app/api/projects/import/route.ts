import { z } from "zod";

import { authed, parseBody } from "@/lib/api/handler";
import { importFromVercel } from "@/server/services/projects";

const importSchema = z.object({ names: z.array(z.string().min(1)).min(1).max(100) });

export const POST = authed(async (req) => importFromVercel((await parseBody(req, importSchema)).names));
