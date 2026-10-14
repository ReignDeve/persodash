import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";

import { ApiError, unauthorized, type ApiErrorBody } from "@/lib/api/errors";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/session";
import { DATABASE_UNAVAILABLE_MESSAGE, isDatabaseUnavailable } from "@/lib/db-errors";
import { Prisma } from "@/app/generated/prisma/client";

type RouteContext<P> = { params: Promise<P> };

type AuthedHandler<P> = (
  req: NextRequest,
  ctx: { params: P; user: CurrentUser },
) => Promise<Response | unknown>;

type PublicHandler<P> = (req: NextRequest, ctx: { params: P }) => Promise<Response | unknown>;

function toResponse(result: unknown, status = 200) {
  if (result instanceof Response) return result;
  if (result === undefined) return new NextResponse(null, { status: 204 });
  return NextResponse.json(result, { status });
}

export function errorResponse(error: unknown) {
  let body: ApiErrorBody;
  let status: number;

  if (error instanceof ApiError) {
    status = error.status;
    body = { error: { message: error.message, code: error.code, details: error.details } };
  } else if (error instanceof ZodError) {
    status = 400;
    body = {
      error: {
        message: error.issues[0]?.message ?? "Invalid input",
        code: "validation",
        details: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    };
  } else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    status = 404;
    body = { error: { message: "Not found", code: "not_found" } };
  } else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    status = 409;
    body = { error: { message: "This entry already exists", code: "conflict" } };
  } else if (isDatabaseUnavailable(error)) {
    console.error("[api] database unreachable");
    status = 503;
    body = { error: { message: DATABASE_UNAVAILABLE_MESSAGE, code: "database_unavailable" } };
  } else {
    console.error("[api] unhandled error", error);
    status = 500;
    body = { error: { message: "Something went wrong", code: "internal" } };
  }

  return NextResponse.json(body, { status });
}

/** Route handler that requires a valid session. All private API routes use this. */
export function authed<P = Record<string, never>>(handler: AuthedHandler<P>) {
  return async (req: NextRequest, ctx: RouteContext<P>) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw unauthorized();
      const result = await handler(req, { params: await ctx.params, user });
      return toResponse(result, req.method === "POST" ? 201 : 200);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/** Route handler without session check (login, health, cron with its own secret). */
export function open<P = Record<string, never>>(handler: PublicHandler<P>) {
  return async (req: NextRequest, ctx: RouteContext<P>) => {
    try {
      return toResponse(await handler(req, { params: await ctx.params }));
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export async function parseBody<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  const json = await req.json().catch(() => {
    throw new ApiError(400, "Request body must be JSON", "bad_request");
  });
  return schema.parse(json);
}

export function parseQuery<T>(req: NextRequest, schema: ZodType<T>): T {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams));
}
