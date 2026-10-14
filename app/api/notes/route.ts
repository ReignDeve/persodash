import { z } from "zod";

import { authed, parseBody, parseQuery } from "@/lib/api/handler";
import { NOTE_FILTERS, noteInputSchema } from "@/lib/schemas/notes";
import { createNote, listNotes } from "@/server/services/notes";

const querySchema = z.object({ filter: z.enum(NOTE_FILTERS).default("open") });

export const GET = authed(async (req) => listNotes(parseQuery(req, querySchema).filter));

export const POST = authed(async (req) => createNote(await parseBody(req, noteInputSchema)));
