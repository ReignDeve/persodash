import { authed, parseBody } from "@/lib/api/handler";
import { notePatchSchema } from "@/lib/schemas/notes";
import { deleteNote, updateNote } from "@/server/services/notes";

type Params = { id: string };

export const PATCH = authed<Params>(async (req, { params }) => updateNote(params.id, await parseBody(req, notePatchSchema)));

export const DELETE = authed<Params>(async (_req, { params }) => {
  await deleteNote(params.id);
});
