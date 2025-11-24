// app/api/public-pool/worker/[address]/route.ts
import { NextResponse } from "next/server";

const PUBLIC_POOL_CLIENT_API = "https://public-pool.io:40557/api/client";

export async function GET(
  _req: Request,
  context: { params: { address: string } },
) {
  const { address } = context.params;

  if (!address) {
    return NextResponse.json(
      { error: "Missing BTC address" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${PUBLIC_POOL_CLIENT_API}/${address}`, {
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch from Public Pool" },
        { status: 502 },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Public Pool worker fetch failed", err);
    return NextResponse.json(
      { error: "Internal error talking to Public Pool" },
      { status: 500 },
    );
  }
}
