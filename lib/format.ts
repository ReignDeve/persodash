import { formatDistanceToNowStrict } from "date-fns";

// Central formatting. Numbers use de-DE grouping, the UI language is English.
const LOCALE = "de-DE";

const HASHRATE_UNITS = ["H/s", "kH/s", "MH/s", "GH/s", "TH/s", "PH/s"];

export function formatHashrate(value: number | null | undefined, digits = 2): string {
  if (!value || value <= 0) return "0 H/s";
  const exp = Math.min(Math.floor(Math.log10(value) / 3), HASHRATE_UNITS.length - 1);
  return `${(value / 1000 ** exp).toFixed(exp === 0 ? 0 : digits)} ${HASHRATE_UNITS[exp]}`;
}

export function formatNumber(value: number, maximumFractionDigits = 0) {
  return value.toLocaleString(LOCALE, { maximumFractionDigits });
}

/** Large numbers like difficulties: 1.2 M, 3.4 G … */
export function formatCompact(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(value);
}

export function formatEur(value: number | null | undefined, opts: { compact?: boolean } = {}) {
  if (value === null || value === undefined) return "–";
  return value.toLocaleString(LOCALE, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: opts.compact || Math.abs(value) >= 1000 ? 0 : 2,
  });
}

export function formatCrypto(value: number | null | undefined, decimals = 8) {
  if (value === null || value === undefined) return "–";
  return value.toLocaleString(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

export function formatKm(value: number) {
  return `${formatNumber(value)} km`;
}

export function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i >= 3 ? 1 : 0)} ${units[i]}`;
}

export function formatDuration(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const toDate = (v: string | Date) => (typeof v === "string" ? new Date(v) : v);

/** 06.10.2026 */
export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "–";
  return toDate(value).toLocaleDateString(LOCALE, { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** "2026-10-06" → "06.10." – works on the plain date string, no timezone shifts. */
export function formatDayMonth(isoDate: string) {
  const [, m, d] = isoDate.split("-");
  return `${d}.${m}.`;
}

/** 06.10. 14:32 */
export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "–";
  return toDate(value).toLocaleString(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(value: string | Date) {
  return toDate(value).toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
}

/** "3 min ago", "2 days ago" */
export function formatRelative(value: string | Date | null | undefined) {
  if (!value) return "–";
  const date = toDate(value);
  if (Math.abs(Date.now() - date.getTime()) < 45_000) return "just now";
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

export function shortenAddress(address: string, head = 6, tail = 6) {
  return address.length <= head + tail + 1 ? address : `${address.slice(0, head)}…${address.slice(-tail)}`;
}

export function hostname(url: string | null | undefined) {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
