import { authed } from "@/lib/api/handler";
import { revokeSession } from "@/server/services/auth";

export const DELETE = authed<{ id: string }>(async (_req, { params, user }) => {
  await revokeSession(user, params.id);
});
