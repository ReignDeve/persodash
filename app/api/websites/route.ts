import { authed } from "@/lib/api/handler";
import { getWebsites } from "@/server/services/websites";

export const GET = authed(async () => getWebsites());
