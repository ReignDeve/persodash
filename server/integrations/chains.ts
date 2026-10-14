import "server-only";

import { z } from "zod";

import { cached, fetchWithTimeout } from "@/server/cache";
import { upstreamError } from "@/lib/api/errors";

const TTL_MS = 60_000;
const SATS_PER_BTC = 1e8;
const LAMPORTS_PER_SOL = 1e9;

const statsSchema = z.object({
  funded_txo_sum: z.number().default(0),
  spent_txo_sum: z.number().default(0),
});

/** On-chain BTC balance (confirmed + mempool) via Blockstream's Esplora API. */
export function fetchBtcBalance(address: string): Promise<number> {
  return cached(`btc:${address}`, TTL_MS, async () => {
    const res = await fetchWithTimeout(`https://blockstream.info/api/address/${encodeURIComponent(address)}`);
    if (!res.ok) throw upstreamError("Blockstream");
    const data = z
      .object({ chain_stats: statsSchema, mempool_stats: statsSchema })
      .parse(await res.json());
    const sats =
      data.chain_stats.funded_txo_sum -
      data.chain_stats.spent_txo_sum +
      data.mempool_stats.funded_txo_sum -
      data.mempool_stats.spent_txo_sum;
    return sats / SATS_PER_BTC;
  });
}

/** Native SOL balance via plain JSON-RPC (no web3.js needed for a single call). */
export function fetchSolBalance(rpcUrl: string, address: string): Promise<number> {
  return cached(`sol:${address}`, TTL_MS, async () => {
    const res = await fetchWithTimeout(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [address] }),
    });
    if (!res.ok) throw upstreamError("Solana RPC");
    const data = z
      .object({ result: z.object({ value: z.number() }).optional(), error: z.unknown().optional() })
      .parse(await res.json());
    if (!data.result) throw upstreamError("Solana RPC");
    return data.result.value / LAMPORTS_PER_SOL;
  });
}

const moralisTokenSchema = z.object({
  symbol: z.string().nullish(),
  name: z.string().nullish(),
  amount: z.coerce.number().nullish(),
  usdValue: z.coerce.number().nullish(),
  usd_value: z.coerce.number().nullish(),
});

export type SplToken = { symbol: string; name: string; amount: number; valueUsd: number | null };

/** SPL tokens of a Solana address via Moralis (optional integration). */
export function fetchSplTokens(apiKey: string, address: string): Promise<SplToken[]> {
  return cached(`moralis:${address}`, 5 * TTL_MS, async () => {
    const res = await fetchWithTimeout(
      `https://solana-gateway.moralis.io/account/mainnet/${encodeURIComponent(address)}/portfolio?excludeSpam=true`,
      { headers: { Accept: "application/json", "X-API-Key": apiKey } },
    );
    if (!res.ok) throw upstreamError("Moralis");
    const data = z.object({ tokens: z.array(moralisTokenSchema).default([]) }).parse(await res.json());
    return data.tokens
      .map((t) => ({
        symbol: t.symbol ?? "?",
        name: t.name ?? t.symbol ?? "Unknown token",
        amount: t.amount ?? 0,
        valueUsd: t.usdValue ?? t.usd_value ?? null,
      }))
      .filter((t) => t.amount > 0);
  });
}
