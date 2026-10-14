import { authed } from "@/lib/api/handler";
import { runFlow } from "@/server/services/actions";

export const POST = authed<{ id: string }>(async (_req, { params }) => runFlow(params.id));
