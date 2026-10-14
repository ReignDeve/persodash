import { authed, parseBody } from "@/lib/api/handler";
import { monitorInputSchema } from "@/lib/schemas/services";
import { createMonitor, listMonitors } from "@/server/services/services";

export const GET = authed(async () => listMonitors());

export const POST = authed(async (req) => createMonitor(await parseBody(req, monitorInputSchema)));
