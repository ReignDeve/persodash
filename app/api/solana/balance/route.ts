// app/api/solana/balance/route.ts
import { NextResponse } from "next/server";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Missing address parameter" },
      { status: 400 }
    );
  }

  try {
    const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
    const pubKey = new PublicKey(address);
    const lamports = await connection.getBalance(pubKey);
    const sol = lamports / 1_000_000_000;

    return NextResponse.json({ address, sol });
  } catch (e: any) {
    console.error("Error getting SOL balance", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to get balance" },
      { status: 500 }
    );
  }
}
