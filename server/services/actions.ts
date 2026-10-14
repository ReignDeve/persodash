import "server-only";

import { db } from "@/lib/db";
import { badRequest, notFound } from "@/lib/api/errors";
import { decryptSecret, encryptSecret, isSecretsConfigured } from "@/lib/crypto";
import { Prisma, type ActionRun, type HttpAction } from "@/app/generated/prisma/client";
import type {
  ActionInput,
  ActionItem,
  ActionsResponse,
  ExecutionResult,
  FlowInput,
  FlowRunResult,
  HeaderInput,
  RequestInput,
  RunSummary,
} from "@/lib/schemas/actions";

const TIMEOUT_MS = 15_000;
const RESPONSE_LIMIT = 200_000;
const PREVIEW_LENGTH = 2_000;
const RUNS_KEPT = 30;
const RUNS_SHOWN = 12;

type StoredHeader = { key: string; value: string; secret: boolean };

const storedHeaders = (a: Pick<HttpAction, "headers">) => (a.headers as StoredHeader[] | null) ?? [];

function toRun(r: ActionRun): RunSummary {
  return {
    id: r.id,
    ok: r.ok,
    status: r.status,
    durationMs: r.durationMs,
    error: r.error,
    trigger: r.trigger,
    startedAt: r.startedAt.toISOString(),
  };
}

function toItem(a: HttpAction & { project: { id: string; name: string } | null; runs: ActionRun[] }): ActionItem {
  return {
    id: a.id,
    name: a.name,
    method: a.method,
    url: a.url,
    // Secret values never leave the server.
    headers: storedHeaders(a).map((h) => ({
      key: h.key,
      value: h.secret ? null : h.value,
      secret: h.secret,
      hasValue: Boolean(h.value),
    })),
    body: a.body,
    expectedStatus: a.expectedStatus,
    project: a.project,
    lastRun: a.runs[0] ? toRun(a.runs[0]) : null,
    recentRuns: a.runs.slice(0, RUNS_SHOWN).map(toRun).reverse(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

/**
 * Turns edited headers into stored ones: secret values are encrypted; a secret
 * left empty keeps its previously stored value.
 */
function prepareHeaders(input: HeaderInput[], previous: StoredHeader[] = []): StoredHeader[] {
  return input
    .filter((h) => h.key)
    .map((h) => {
      if (!h.secret) return { key: h.key, value: h.value ?? "", secret: false };
      if (h.value) return { key: h.key, value: encryptSecret(h.value), secret: true };
      const kept = previous.find((p) => p.secret && p.key.toLowerCase() === h.key.toLowerCase());
      return { key: h.key, value: kept?.value ?? "", secret: true };
    });
}

function plainHeaders(headers: StoredHeader[]) {
  return headers.filter((h) => h.key).map((h) => [h.key, h.secret ? decryptSecret(h.value) : h.value] as [string, string]);
}

/** Executes one request from this server. Never throws – failures are part of the result. */
export async function execute(
  request: { method: string; url: string; headers: [string, string][]; body: string | null; expectedStatus: number | null },
): Promise<ExecutionResult> {
  const headers = new Headers(request.headers);
  if (request.body && !headers.has("content-type")) {
    try {
      JSON.parse(request.body);
      headers.set("content-type", "application/json");
    } catch {
      headers.set("content-type", "text/plain; charset=utf-8");
    }
  }
  if (!headers.has("user-agent")) headers.set("user-agent", "PersoDash-Actions/1.0");

  const started = performance.now();
  try {
    const res = await fetch(request.url, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : (request.body ?? undefined),
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const raw = request.method === "HEAD" ? "" : await res.text();
    const durationMs = Math.round(performance.now() - started);
    const contentType = res.headers.get("content-type");

    let body = raw.slice(0, RESPONSE_LIMIT);
    if (contentType?.includes("json") && raw.length <= RESPONSE_LIMIT) {
      try {
        body = JSON.stringify(JSON.parse(raw), null, 2);
      } catch {
        // keep raw
      }
    }

    const ok = request.expectedStatus ? res.status === request.expectedStatus : res.status < 400;
    return {
      ok,
      status: res.status,
      statusText: res.statusText || null,
      durationMs,
      size: Buffer.byteLength(raw),
      contentType,
      headers: [...res.headers.entries()],
      body: body || null,
      truncated: raw.length > RESPONSE_LIMIT,
      error: ok ? null : `Expected ${request.expectedStatus ?? "< 400"}, got ${res.status}`,
    };
  } catch (error) {
    const err = error as Error & { cause?: { code?: string; message?: string } };
    return {
      ok: false,
      status: null,
      statusText: null,
      durationMs: Math.round(performance.now() - started),
      size: null,
      contentType: null,
      headers: [],
      body: null,
      truncated: false,
      error: err.name === "TimeoutError" ? `Timed out after ${TIMEOUT_MS / 1000}s` : (err.cause?.code ?? err.cause?.message ?? err.message),
    };
  }
}

async function recordRun(data: { actionId?: string; flowId?: string; trigger: string }, result: ExecutionResult | { ok: boolean; durationMs: number; error: string | null; status?: number | null; body?: string | null }) {
  await db.actionRun.create({
    data: {
      ...data,
      ok: result.ok,
      status: result.status ?? null,
      durationMs: result.durationMs,
      error: result.error,
      preview: result.body ? result.body.slice(0, PREVIEW_LENGTH) : null,
    },
  });
  // Keep the history short.
  const where = data.actionId ? { actionId: data.actionId } : { flowId: data.flowId };
  const old = await db.actionRun.findMany({ where, orderBy: { startedAt: "desc" }, skip: RUNS_KEPT, select: { id: true } });
  if (old.length) await db.actionRun.deleteMany({ where: { id: { in: old.map((r) => r.id) } } });
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

const include = {
  project: { select: { id: true, name: true } },
  runs: { orderBy: { startedAt: "desc" as const }, take: RUNS_SHOWN },
};

export async function listActions(): Promise<ActionsResponse> {
  const [actions, flows] = await Promise.all([
    db.httpAction.findMany({ include, orderBy: [{ name: "asc" }] }),
    db.actionFlow.findMany({ orderBy: { name: "asc" }, include: { runs: { orderBy: { startedAt: "desc" }, take: 1 } } }),
  ]);
  const byId = new Map(actions.map((a) => [a.id, a]));
  return {
    actions: actions.map(toItem),
    flows: flows.map((f) => ({
      id: f.id,
      name: f.name,
      stopOnFailure: f.stopOnFailure,
      steps: f.steps.map((id) => {
        const a = byId.get(id);
        return { id, name: a?.name ?? "Deleted action", method: a?.method ?? "GET", missing: !a };
      }),
      lastRun: f.runs[0] ? toRun(f.runs[0]) : null,
    })),
    secretsConfigured: isSecretsConfigured(),
  };
}

function toData(input: ActionInput, previous: StoredHeader[] = []) {
  const { headers, ...rest } = input;
  return { ...rest, headers: prepareHeaders(headers, previous) as unknown as Prisma.InputJsonValue };
}

export async function createAction(input: ActionInput) {
  const action = await db.httpAction.create({ data: toData(input), include });
  return toItem(action);
}

export async function updateAction(id: string, input: ActionInput) {
  const existing = await db.httpAction.findUnique({ where: { id } });
  if (!existing) throw notFound("Action not found");
  const action = await db.httpAction.update({ where: { id }, data: toData(input, storedHeaders(existing)), include });
  return toItem(action);
}

export async function deleteAction(id: string) {
  await db.httpAction.delete({ where: { id } });
}

export async function runAction(id: string, trigger = "app") {
  const action = await db.httpAction.findUnique({ where: { id } });
  if (!action) throw notFound("Action not found");
  const result = await execute({
    method: action.method,
    url: action.url,
    headers: plainHeaders(storedHeaders(action)),
    body: action.body,
    expectedStatus: action.expectedStatus,
  });
  await recordRun({ actionId: id, trigger }, result);
  return result;
}

/** Unsaved request from the playground. Stored secrets of `actionId` fill in masked headers. */
export async function tryRequest(input: RequestInput & { actionId?: string }) {
  const previous = input.actionId
    ? storedHeaders((await db.httpAction.findUnique({ where: { id: input.actionId } })) ?? { headers: [] })
    : [];
  const headers = input.headers
    .filter((h) => h.key)
    .map((h): [string, string] => {
      if (h.value !== null && h.value !== "") return [h.key, h.value];
      const kept = previous.find((p) => p.secret && p.key.toLowerCase() === h.key.toLowerCase());
      return [h.key, kept ? decryptSecret(kept.value) : ""];
    });
  return execute({ ...input, headers });
}

// ---------------------------------------------------------------------------
// Flows
// ---------------------------------------------------------------------------

async function validateSteps(steps: string[]) {
  const found = await db.httpAction.count({ where: { id: { in: steps } } });
  if (found !== new Set(steps).size) throw badRequest("A flow step points to an action that no longer exists");
}

export async function createFlow(input: FlowInput) {
  await validateSteps(input.steps);
  return db.actionFlow.create({ data: input });
}

export async function updateFlow(id: string, input: FlowInput) {
  await validateSteps(input.steps);
  return db.actionFlow.update({ where: { id }, data: input });
}

export async function deleteFlow(id: string) {
  await db.actionFlow.delete({ where: { id } });
}

/** Runs the steps in order; each step is also recorded on its action. */
export async function runFlow(id: string, trigger = "app"): Promise<FlowRunResult> {
  const flow = await db.actionFlow.findUnique({ where: { id } });
  if (!flow) throw notFound("Flow not found");
  const actions = await db.httpAction.findMany({ where: { id: { in: flow.steps } } });

  const started = performance.now();
  const steps: FlowRunResult["steps"] = [];
  let failed = false;

  for (const stepId of flow.steps) {
    const action = actions.find((a) => a.id === stepId);
    if (!action) {
      steps.push({ actionId: stepId, name: "Deleted action", skipped: true, result: null });
      failed = true;
      continue;
    }
    if (failed && flow.stopOnFailure) {
      steps.push({ actionId: stepId, name: action.name, skipped: true, result: null });
      continue;
    }
    const result = await runAction(action.id, `flow:${flow.name}`);
    steps.push({ actionId: stepId, name: action.name, skipped: false, result });
    if (!result.ok) failed = true;
  }

  const outcome = { ok: !failed, durationMs: Math.round(performance.now() - started), steps };
  await recordRun(
    { flowId: id, trigger },
    {
      ok: outcome.ok,
      durationMs: outcome.durationMs,
      error: failed ? `${steps.filter((s) => s.result && !s.result.ok).length} step(s) failed` : null,
    },
  );
  return outcome;
}

/** For automation: runs the action or flow whose name matches best. */
export async function runByName(name: string, trigger: string) {
  const needle = name.toLowerCase();
  const [actions, flows] = await Promise.all([
    db.httpAction.findMany({ where: { name: { contains: name, mode: "insensitive" } }, select: { id: true, name: true } }),
    db.actionFlow.findMany({ where: { name: { contains: name, mode: "insensitive" } }, select: { id: true, name: true } }),
  ]);
  const exact = <T extends { name: string }>(list: T[]) => list.find((x) => x.name.toLowerCase() === needle);

  const flow = exact(flows) ?? (exact(actions) ? undefined : flows[0]);
  if (flow) {
    const result = await runFlow(flow.id, trigger);
    return { kind: "flow" as const, name: flow.name, ok: result.ok, durationMs: result.durationMs, steps: result.steps.map((s) => ({ name: s.name, ok: s.result?.ok ?? false, skipped: s.skipped })) };
  }
  const action = exact(actions) ?? actions[0];
  if (!action) throw notFound(`No action or flow matching “${name}”`);
  const result = await runAction(action.id, trigger);
  return { kind: "action" as const, name: action.name, ok: result.ok, status: result.status, durationMs: result.durationMs, error: result.error, body: result.body?.slice(0, PREVIEW_LENGTH) ?? null };
}
