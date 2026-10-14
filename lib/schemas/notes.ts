import { z } from "zod";

export const NOTE_MAX_LENGTH = 4000;

export const noteInputSchema = z.object({
  body: z.string().trim().min(1, "Write something first").max(NOTE_MAX_LENGTH),
  projectId: z
    .string()
    .nullish()
    .transform((v) => (v ? v : null)),
});

export type NoteInput = z.infer<typeof noteInputSchema>;

/** Partial update; absent fields stay untouched. */
export const notePatchSchema = z.object({
  body: z.string().trim().min(1).max(NOTE_MAX_LENGTH).optional(),
  pinned: z.boolean().optional(),
  done: z.boolean().optional(),
  projectId: z.string().nullable().optional(),
});

export type NotePatch = z.infer<typeof notePatchSchema>;

export const NOTE_FILTERS = ["open", "pinned", "done"] as const;
export type NoteFilter = (typeof NOTE_FILTERS)[number];

export type NoteItem = {
  id: string;
  body: string;
  pinned: boolean;
  done: boolean;
  source: string;
  project: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type NotesResponse = {
  items: NoteItem[];
  counts: { open: number; pinned: number; done: number };
};
