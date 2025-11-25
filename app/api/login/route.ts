import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));

  const ENV_USER = process.env.DASHBOARD_USERNAME;
  const ENV_PASS = process.env.DASHBOARD_PASSWORD;

  if (!ENV_USER || !ENV_PASS) {
    return NextResponse.json(
      { error: "Server login not configured" },
      { status: 500 }
    );
  }

  if (username !== ENV_USER || password !== ENV_PASS) {
    // falsche Logins nicht zu präzise melden
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }

  // Simple Session-Cookie
  // Hinweis: Für persönliche Nutzung ok. Für maximale Sicherheit → signierte Tokens / NextAuth.
  const res = NextResponse.json({ ok: true });

  res.headers.append(
    "Set-Cookie",
    [
      `dashboard_session=1`,
      `Path=/`,
      `HttpOnly`,
      `SameSite=Lax`,
      `Max-Age=${60 * 60 * 24 * 7}`, // 7 Tage
    ]
      .filter(Boolean)
      .join("; ")
  );

  return res;
}
