import { authed } from "@/lib/api/handler";
import { getSystemStatus } from "@/server/services/system";

export const GET = authed(async () => getSystemStatus());
