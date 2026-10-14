import { authed } from "@/lib/api/handler";
import { revokeToken } from "@/server/services/tokens";

export const DELETE = authed<{ id: string }>(async (_req, { params }) => {
  await revokeToken(params.id);
});
