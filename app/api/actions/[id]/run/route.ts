import { authed } from "@/lib/api/handler";
import { runAction } from "@/server/services/actions";

export const POST = authed<{ id: string }>(async (_req, { params }) => runAction(params.id));
