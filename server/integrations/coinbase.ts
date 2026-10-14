import "server-only";

import { generateJwt } from "@coinbase/cdp-sdk/auth";
import { z } from "zod";

import { cached, fetchWithTimeout } from "@/server/cache";
import { upstreamError } from "@/lib/api/errors";

const HOST = "api.coinbase.com";
const PATH = "/v2/accounts";
const TTL_MS = 60_000;

const accountSchema = z.object({
  id: z.string(),
  name: z.string().nullish(),
  primary: z.boolean().default(false),
  type: z.string(),
  currency: z.object({ code: z.string(), name: z.string().nullish() }),
  balance: z.object({ amount: z.string(), currency: z.string() }),
});

export type CoinbaseAccount = z.infer<typeof accountSchema>;

export function fetchCoinbaseAccounts(apiKeyId: string, apiKeySecret: string) {
  return cached("coinbase:accounts", TTL_MS, async () => {
    const jwt = await generateJwt({
      apiKeyId,
      apiKeySecret,
      requestMethod: "GET",
      requestHost: HOST,
      requestPath: PATH,
    });

    const res = await fetchWithTimeout(`https://${HOST}${PATH}?limit=100`, {
      headers: { Authorization: `Bearer ${jwt}`, Accept: "application/json" },
    });

    if (!res.ok) {
      // Log the status only – the body can echo request details.
      console.warn(`[coinbase] accounts → ${res.status}`);
      throw upstreamError("Coinbase");
    }

    return z.object({ data: z.array(accountSchema) }).parse(await res.json()).data;
  });
}
