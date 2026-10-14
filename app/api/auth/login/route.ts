import { open, parseBody } from "@/lib/api/handler";
import { loginSchema } from "@/lib/schemas/settings";
import { login } from "@/server/services/auth";

export const POST = open(async (req) => {
  const credentials = await parseBody(req, loginSchema);
  return login(credentials);
});
