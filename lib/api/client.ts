import type { ApiErrorBody } from "@/lib/api/errors";

/** Error thrown by `api()` – carries the server's message and validation details. */
export class ClientApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ClientApiError";
  }
}

type Options = { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown; signal?: AbortSignal };

/** Typed JSON fetch against our own API. Redirects to /login when the session expired. */
export async function api<T>(path: string, { method = "GET", body, signal }: Options = {}): Promise<T> {
  const res = await fetch(path, {
    method,
    signal,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });

  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/auth/")) {
    window.location.assign(`/login?from=${encodeURIComponent(window.location.pathname)}`);
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as ApiErrorBody | null)?.error;
    throw new ClientApiError(res.status, err?.message ?? `Request failed (${res.status})`, err?.code ?? "error", err?.details);
  }
  return data as T;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}
