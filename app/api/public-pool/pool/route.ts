// app/api/public-pool/pool/route.ts
import { NextResponse } from "next/server";

const PUBLIC_POOL_POOL_API = "https://public-pool.io:40557/api/pool";

export async function GET() {
  try {
    const res = await fetch(PUBLIC_POOL_POOL_API, {
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch pool stats from Public Pool" },
        { status: 502 },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Public Pool pool fetch failed", err);
    return NextResponse.json(
      { error: "Internal error talking to Public Pool" },
      { status: 500 },
    );
  }
}
