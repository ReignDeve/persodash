import "server-only";

import { db } from "@/lib/db";
import { notFound } from "@/lib/api/errors";
import type { Note, Project } from "@/app/generated/prisma/client";
import type { NoteFilter, NoteInput, NoteItem, NotePatch, NotesResponse } from "@/lib/schemas/notes";

const LIST_LIMIT = 300;

function toItem(n: Note & { project: Pick<Project, "id" | "name"> | null }): NoteItem {
  return {
    id: n.id,
    body: n.body,
    pinned: n.pinned,
    done: n.doneAt !== null,
    source: n.source,
    project: n.project,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}

const include = { project: { select: { id: true, name: true } } } as const;

export async function listNotes(filter: NoteFilter = "open"): Promise<NotesResponse> {
  const where =
    filter === "done" ? { doneAt: { not: null } } : filter === "pinned" ? { pinned: true, doneAt: null } : { doneAt: null };

  const [items, open, pinned, done] = await Promise.all([
    db.note.findMany({
      where,
      include,
      orderBy: filter === "done" ? [{ doneAt: "desc" }] : [{ pinned: "desc" }, { createdAt: "desc" }],
      take: LIST_LIMIT,
    }),
    db.note.count({ where: { doneAt: null } }),
    db.note.count({ where: { doneAt: null, pinned: true } }),
    db.note.count({ where: { doneAt: { not: null } } }),
  ]);
  return { items: items.map(toItem), counts: { open, pinned, done } };
}

export async function createNote(input: NoteInput, source = "app") {
  const note = await db.note.create({ data: { ...input, source }, include });
  return toItem(note);
}

export async function updateNote(id: string, patch: NotePatch) {
  const { done, ...rest } = patch;
  const note = await db.note.update({
    where: { id },
    data: { ...rest, ...(done === undefined ? {} : { doneAt: done ? new Date() : null }) },
    include,
  });
  return toItem(note);
}

export async function deleteNote(id: string) {
  await db.note.delete({ where: { id } });
}

/**
 * Turns a note into the next step of its project (or the given one) and files
 * the note away – the path from loose thought to committed work.
 */
export async function promoteNote(id: string, projectId?: string) {
  const note = await db.note.findUnique({ where: { id } });
  if (!note) throw notFound("Note not found");
  const target = projectId ?? note.projectId;
  if (!target) throw notFound("Choose a project first");

  const nextStep = note.body.split("\n")[0].slice(0, 200);
  await db.$transaction([
    db.project.update({ where: { id: target }, data: { nextStep } }),
    db.note.update({ where: { id }, data: { projectId: target, doneAt: new Date() } }),
  ]);
  return { projectId: target, nextStep };
}

export function countOpenNotes() {
  return db.note.count({ where: { doneAt: null } });
}
