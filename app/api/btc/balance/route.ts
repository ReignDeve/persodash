// app/api/btc/balance/route.ts
import { NextResponse } from "next/server";

const BLOCKSTREAM_BASE = "https://blockstream.info/api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Missing address query param" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${BLOCKSTREAM_BASE}/address/${address}`, {
      // allow caching for 60 seconds
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Blockstream error:", res.status, text);
      return NextResponse.json(
        { error: "Failed to fetch BTC balance" },
        { status: 502 }
      );
    }

    const data = await res.json();

    // based on Blockstream-API:
    // chain_stats.funded_txo_sum / spent_txo_sum (on-chain)
    // mempool_stats.* (mempool)
    const funded =
      (data.chain_stats?.funded_txo_sum ?? 0) +
      (data.mempool_stats?.funded_txo_sum ?? 0);
    const spent =
      (data.chain_stats?.spent_txo_sum ?? 0) +
      (data.mempool_stats?.spent_txo_sum ?? 0);

    const sats = funded - spent;
    const btc = sats / 1e8;

    return NextResponse.json({
      address,
      sats,
      btc,
    });
  } catch (e) {
    console.error("BTC balance route error", e);
    return NextResponse.json(
      { error: "Internal error fetching BTC balance" },
      { status: 500 }
    );
  }
}
