// app/api/coinbase/accounts/route.ts
import { NextResponse } from "next/server";
import { generateJwt } from "@coinbase/cdp-sdk/auth";

export async function GET() {
  const apiKeyId = process.env.COINBASE_API_KEY_ID;
  const apiKeySecret = process.env.COINBASE_API_KEY_SECRET;

  if (!apiKeyId || !apiKeySecret) {
    return NextResponse.json(
      { error: "COINBASE_API_KEY_ID oder COINBASE_API_KEY_SECRET fehlt" },
      { status: 500 }
    );
  }

  try {
    // 1) JWT für diesen Request erzeugen
    const jwt = await generateJwt({
      apiKeyId,
      apiKeySecret,
      requestMethod: "GET",
      requestHost: "api.coinbase.com",
      requestPath: "/v2/accounts",
      // expiresIn: 120, // optional
    });

    // 2) Coinbase Track API callen
    const res = await fetch("https://api.coinbase.com/v2/accounts", {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Coinbase /v2/accounts error:", res.status, text);
      return NextResponse.json(
        {
          error: "Coinbase API error",
          status: res.status,
          details: text,
        },
        { status: 500 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Coinbase route internal error:", err);
    return NextResponse.json(
      { error: "Internal error calling Coinbase" },
      { status: 500 }
    );
  }
}
