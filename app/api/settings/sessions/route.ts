import { authed } from "@/lib/api/handler";
import { revokeOtherSessions } from "@/server/services/auth";

/** Signs out every session except the current one. */
export const DELETE = authed(async (_req, { user }) => revokeOtherSessions(user));
