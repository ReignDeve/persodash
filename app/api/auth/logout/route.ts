import { open } from "@/lib/api/handler";
import { destroyCurrentSession } from "@/lib/auth/session";

export const POST = open(async () => {
  await destroyCurrentSession();
  return { ok: true };
});
