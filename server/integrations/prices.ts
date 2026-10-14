import "server-only";

import { z } from "zod";

import { cached, fetchWithTimeout } from "@/server/cache";

const TTL_MS = 5 * 60_000;

/** Coinbase / ticker symbol → CoinGecko id. Unknown symbols simply get no fiat value. */
const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  USDC: "usd-coin",
  USDT: "tether",
  ADA: "cardano",
  DOT: "polkadot",
  XRP: "ripple",
  LTC: "litecoin",
  DOGE: "dogecoin",
  MATIC: "matic-network",
  POL: "polygon-ecosystem-token",
  AVAX: "avalanche-2",
  LINK: "chainlink",
};

export type PriceTable = {
  /** EUR price per unit, by upper-case symbol. EUR itself is always 1. */
  eur: Record<string, number>;
  /** EUR per USD, derived from the BTC quote in both currencies. */
  usdToEur: number | null;
};

export function fetchPrices(): Promise<PriceTable> {
  return cached("prices", TTL_MS, async () => {
    const ids = Object.values(COINGECKO_IDS).join(",");
    const res = await fetchWithTimeout(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=eur,usd`,
    );
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const data = z
      .record(z.string(), z.object({ eur: z.number().optional(), usd: z.number().optional() }))
      .parse(await res.json());

    const eur: Record<string, number> = { EUR: 1 };
    for (const [symbol, id] of Object.entries(COINGECKO_IDS)) {
      const quote = data[id]?.eur;
      if (quote !== undefined) eur[symbol] = quote;
    }

    const btc = data.bitcoin;
    const usdToEur = btc?.eur && btc?.usd ? btc.eur / btc.usd : null;
    return { eur, usdToEur };
  });
}

/** Prices are a nice-to-have: failures degrade to "no fiat values". */
export async function fetchPricesSafe(): Promise<PriceTable> {
  try {
    return await fetchPrices();
  } catch (error) {
    console.warn("[prices] unavailable", (error as Error).message);
    return { eur: { EUR: 1 }, usdToEur: null };
  }
}
