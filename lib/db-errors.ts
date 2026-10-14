// Recognises "the database is not reachable" across the different shapes the
// pg adapter and Prisma report it in (connection refused, DNS, timeouts …).

const CONNECTION_CODES = new Set(["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN", "P1001", "P1002"]);

export function isDatabaseUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; name?: unknown; cause?: unknown; message?: unknown };
  if (typeof e.code === "string" && CONNECTION_CODES.has(e.code)) return true;
  if (e.name === "PrismaClientInitializationError") return true;
  if (typeof e.message === "string" && /ECONNREFUSED|Can't reach database server/.test(e.message)) return true;
  return e.cause ? isDatabaseUnavailable(e.cause) : false;
}

export const DATABASE_UNAVAILABLE_MESSAGE =
  "The database is not reachable. Check that PostgreSQL is running and DATABASE_URL is correct.";
