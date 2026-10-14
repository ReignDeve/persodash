import { authed } from "@/lib/api/handler";
import { checkMonitorNow } from "@/server/services/services";

export const POST = authed<{ id: string }>(async (_req, { params }) => checkMonitorNow(params.id));
