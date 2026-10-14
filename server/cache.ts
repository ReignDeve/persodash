import "server-only";

// Tiny in-process TTL cache. Shields slow third-party APIs from repeated
// polling (several pages + the scheduler ask for the same data) and
// de-duplicates concurrent requests by caching the in-flight promise.

type Entry<T> = { value: Promise<T>; expiresAt: number };

const store = new Map<string, Entry<unknown>>();

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expiresAt > now) return hit.value;

  const value = load();
  store.set(key, { value, expiresAt: now + ttlMs });
  // Never cache failures.
  value.catch(() => store.delete(key));
  return value;
}

export function invalidate(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/** fetch with a hard timeout – external services must never hang a request. */
export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit & { timeoutMs?: number } = {},
) {
  const { timeoutMs = 8000, ...rest } = init;
  return fetch(input, { cache: "no-store", ...rest, signal: AbortSignal.timeout(timeoutMs) });
}
