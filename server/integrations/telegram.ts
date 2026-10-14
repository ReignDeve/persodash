import "server-only";

import { env } from "@/lib/env";
import { fetchWithTimeout } from "@/server/cache";

export function isTelegramConfigured() {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = env();
  return Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
}

/** Escapes text for Telegram's HTML parse mode (safer than legacy Markdown). */
export function escapeTelegram(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Sends a message; never throws – notification delivery must not break callers. */
export async function sendTelegram(html: string): Promise<boolean> {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, NODE_ENV, TELEGRAM_IN_DEV } = env();
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false;
  // A local dev server must never message the real chat next to production.
  if (NODE_ENV !== "production" && !TELEGRAM_IN_DEV) {
    console.info("[telegram] skipped in development (set TELEGRAM_IN_DEV=true to send)");
    return false;
  }

  try {
    const res = await fetchWithTimeout(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: html,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) console.warn(`[telegram] sendMessage → ${res.status}`);
    return res.ok;
  } catch (error) {
    console.warn("[telegram] send failed", (error as Error).message);
    return false;
  }
}
