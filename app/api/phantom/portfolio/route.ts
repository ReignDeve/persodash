import { NextResponse } from "next/server";

const MORALIS_SOLANA_BASE = "https://solana-gateway.moralis.io/account/mainnet";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("solAddress");

  if (!address) {
    return NextResponse.json(
      { error: "Missing solAddress query param" },
      { status: 400 }
    );
  }

  const apiKey = process.env.MORALIS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "MORALIS_API_KEY not set" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `${MORALIS_SOLANA_BASE}/${address}/portfolio?nftMetadata=false&mediaItems=false&excludeSpam=true`,
      {
        headers: {
          Accept: "application/json",
          "X-API-Key": apiKey,
        },
        cache: "no-store",
      }
    );

    // log errors from Moralis
    if (!res.ok) {
      const text = await res.text();
      console.error("Moralis portfolio error:", res.status, text);
      return NextResponse.json(
        { error: `Moralis error ${res.status}`, details: text },
        { status: 502 }
      );
    }

    const data = await res.json();
    // structure based on docs: nativeBalance + tokens[] etc.

    const tokens = (data.tokens ?? []).map((t: any) => {
      const rawBal = Number(t.balance ?? 0);
      const decimals = Number(t.decimals ?? 0);
      const amount = decimals ? rawBal / 10 ** decimals : rawBal;

      return {
        symbol: t.symbol,
        name: t.name,
        amount,
        usdValue: Number(t.usd_value ?? t.usdValue ?? 0),
        tokenAddress: t.token_address ?? t.mint,
      };
    });

    const totalUsd = tokens.reduce(
      (sum: number, x: any) => sum + (x.usdValue || 0),
      Number(data.nativeBalance?.usd_value ?? 0)
    );

    return NextResponse.json({
      address,
      totalUsd,
      native: data.nativeBalance ?? null,
      tokens: tokens.sort((a: any, b: any) => b.usdValue - a.usdValue),
    });
  } catch (e: any) {
    console.error("Internal portfolio error", e);
    return NextResponse.json(
      { error: "Internal error fetching portfolio" },
      { status: 500 }
    );
  }
}
