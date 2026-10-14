import { withToken } from "@/lib/api/token-auth";
import { buildSummary } from "@/server/services/automation";

/** Compact status for LUCY & co: headline, attention items, focus, renewals. */
export const GET = withToken("read", async () => buildSummary());
