import { authed, parseBody } from "@/lib/api/handler";
import { passwordChangeSchema } from "@/lib/schemas/settings";
import { changePassword } from "@/server/services/auth";

export const POST = authed(async (req, { user }) => {
  const { currentPassword, newPassword } = await parseBody(req, passwordChangeSchema);
  await changePassword(user, currentPassword, newPassword);
  return { ok: true };
});
