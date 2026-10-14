import { NextResponse } from "next/server";

import { db } from "@/lib/db";

/** Liveness/readiness probe for Docker and uptime monitors. Reveals nothing private. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "degraded" }, { status: 503 });
  }
}
