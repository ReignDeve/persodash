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
    // wrong logins should not be too specific
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Simple Session-Cookie
  // Note: For personal use ok. For maximum security → signed tokens / NextAuth. => next versions should implement that
  const res = NextResponse.json({ ok: true });

  res.headers.append(
    "Set-Cookie",
    [
      `dashboard_session=1`,
      `Path=/`,
      `HttpOnly`,
      `SameSite=Lax`,
      `Max-Age=${60 * 60 * 24 * 7}`, // 7 days
    ]
      .filter(Boolean)
      .join("; ")
  );

  return res;
}
