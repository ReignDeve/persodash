// Shared between the proxy (edge of the request pipeline) and server code.
export const SESSION_COOKIE = "pd_session";
export const SESSION_TTL_DAYS = 30;
/** Refresh lastSeenAt / expiry at most this often to avoid a write per request. */
export const SESSION_TOUCH_INTERVAL_MS = 15 * 60 * 1000;
