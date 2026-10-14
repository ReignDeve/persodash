import "server-only";

import { db } from "@/lib/db";
import { notFound } from "@/lib/api/errors";
import { addSteps, daysBetween, fromDateOnly, toDateOnly, today } from "@/lib/dates";
import type { Routine, RoutineCompletion } from "@/app/generated/prisma/client";
import type {
  RoutineAction,
  RoutineBucket,
  RoutineInput,
  RoutineItem,
  RoutinesResponse,
} from "@/lib/schemas/routines";
import { notify, transitionAlert } from "@/server/services/notifications";

const HISTORY_SHOWN = 8;
const WEEK_DAYS = 7;

/**
 * Fixed schedule: the next due date keeps its rhythm (e.g. the 1st of every
 * month) and lands on the first occurrence after today, however late the task
 * was completed.
 */
function nextOccurrence(from: Date, cadence: Routine["cadence"], interval: number) {
  const now = today();
  let next = addSteps(from, cadence, interval);
  while (next <= now) next = addSteps(next, cadence, interval);
  return next;
}

function bucketOf(active: boolean, days: number): RoutineBucket {
  if (!active) return "paused";
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= WEEK_DAYS) return "week";
  return "later";
}

function toItem(
  r: Routine & { project: { id: string; name: string } | null; completions: RoutineCompletion[] },
): RoutineItem {
  const days = daysBetween(today(), r.nextDue);
  // Newest first from the query; history is shown oldest first.
  const outcomes = r.completions.map((c) =>
    c.outcome === "skipped" ? ("skipped" as const) : toDateOnly(c.doneAt) > toDateOnly(c.dueDate) ? ("late" as const) : ("done" as const),
  );
  let streak = 0;
  for (const o of outcomes) {
    if (o !== "done") break;
    streak++;
  }
  const lastDone = r.completions.find((c) => c.outcome === "done");

  return {
    id: r.id,
    title: r.title,
    notes: r.notes,
    cadence: r.cadence,
    interval: r.interval,
    nextDue: toDateOnly(r.nextDue),
    daysUntilDue: days,
    bucket: bucketOf(r.active, days),
    remind: r.remind,
    active: r.active,
    project: r.project,
    lastDoneAt: lastDone?.doneAt.toISOString() ?? null,
    streak,
    history: outcomes.slice(0, HISTORY_SHOWN).reverse(),
  };
}

const include = {
  project: { select: { id: true, name: true } },
  completions: { orderBy: { doneAt: "desc" as const }, take: 30 },
};

export async function listRoutines(): Promise<RoutinesResponse> {
  const routines = await db.routine.findMany({ include, orderBy: [{ active: "desc" }, { nextDue: "asc" }] });
  const items = routines.map(toItem);
  const counts: Record<RoutineBucket, number> = { overdue: 0, today: 0, week: 0, later: 0, paused: 0 };
  for (const i of items) counts[i.bucket]++;
  return { items, counts };
}

function toData(input: RoutineInput) {
  return { ...input, nextDue: fromDateOnly(input.nextDue) };
}

export function createRoutine(input: RoutineInput) {
  return db.routine.create({ data: toData(input) });
}

export function updateRoutine(id: string, input: RoutineInput) {
  return db.routine.update({ where: { id }, data: toData(input) });
}

export async function deleteRoutine(id: string) {
  await db.routine.delete({ where: { id } });
}

/** Done / skip record a completion and reschedule; snooze only moves the due date. */
export async function actOnRoutine(id: string, { action, days }: RoutineAction) {
  const routine = await db.routine.findUnique({ where: { id } });
  if (!routine) throw notFound("Routine not found");

  if (action === "snooze") {
    const until = addSteps(today(), "daily", days ?? 1);
    await db.routine.update({ where: { id }, data: { nextDue: until } });
    return { nextDue: toDateOnly(until) };
  }

  const nextDue = nextOccurrence(routine.nextDue, routine.cadence, routine.interval);
  await db.$transaction([
    db.routineCompletion.create({
      data: { routineId: id, dueDate: routine.nextDue, outcome: action === "done" ? "done" : "skipped" },
    }),
    db.routine.update({ where: { id }, data: { nextDue } }),
  ]);
  return { nextDue: toDateOnly(nextDue) };
}

/** For voice/automation: completes the routine whose title matches best. */
export async function completeRoutineByTitle(title: string) {
  const candidates = await db.routine.findMany({
    where: { active: true, title: { contains: title, mode: "insensitive" } },
    orderBy: { nextDue: "asc" },
  });
  const match = candidates.find((r) => r.title.toLowerCase() === title.toLowerCase()) ?? candidates[0];
  if (!match) throw notFound(`No active routine matching “${title}”`);
  const { nextDue } = await actOnRoutine(match.id, { action: "done" });
  return { id: match.id, title: match.title, nextDue };
}

/** Scheduled job: one notification when a routine becomes due. */
export async function runRoutineReminders() {
  const due = await db.routine.findMany({ where: { active: true, remind: true, nextDue: { lte: today() } } });
  let sent = 0;
  for (const r of due) {
    const change = await transitionAlert(`routine:${r.id}:${toDateOnly(r.nextDue)}`, true);
    if (change !== "raised") continue;
    const overdue = daysBetween(r.nextDue, today());
    await notify({
      category: "routine",
      severity: overdue > 0 ? "warning" : "info",
      title: overdue > 0 ? `${r.title} is ${overdue} day${overdue === 1 ? "" : "s"} overdue` : `Due today: ${r.title}`,
      message: r.notes ?? "Mark it done in PersoDash when you're finished.",
      source: `routine:${r.id}`,
    });
    sent++;
  }
  return { sent };
}

export async function countDueRoutines() {
  return db.routine.count({ where: { active: true, nextDue: { lte: today() } } });
}
