import { parseBody } from "@/lib/api/handler";
import { withToken } from "@/lib/api/token-auth";
import { automationNoteSchema } from "@/lib/schemas/automation";
import { captureNote } from "@/server/services/automation";

/** Capture into the inbox: { "text": "…", "project"?: "name" } */
export const POST = withToken("notes", async (req, token) => {
  const { text, project } = await parseBody(req, automationNoteSchema);
  const note = await captureNote(text, project, token.name);
  return { ok: true, id: note.id, message: "Saved to inbox" };
});
