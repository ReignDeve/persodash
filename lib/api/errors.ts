/** Error with an HTTP status that is safe to expose to the client. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = "error",
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new ApiError(400, message, "bad_request", details);
export const unauthorized = (message = "Not signed in") =>
  new ApiError(401, message, "unauthorized");
export const notFound = (message = "Not found") => new ApiError(404, message, "not_found");
export const tooManyRequests = (retryAfter: number) =>
  new ApiError(429, `Too many attempts. Try again in ${retryAfter}s.`, "rate_limited");
export const upstreamError = (service: string) =>
  new ApiError(502, `${service} is not reachable right now.`, "upstream");
export const notConfigured = (service: string) =>
  new ApiError(503, `${service} is not configured.`, "not_configured");

/** Shape of every error response body. */
export type ApiErrorBody = { error: { message: string; code: string; details?: unknown } };
