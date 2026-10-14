"use client";

import { useId, useState } from "react";

import { fieldControl } from "@/components/ui/input";
import { ProjectSelect } from "@/components/ui/project-select";
import { useCreateNote } from "@/features/inbox/api";
import { NOTE_MAX_LENGTH } from "@/lib/schemas/notes";
import { cn } from "@/lib/utils";

type CaptureFieldProps = {
  initialText?: string;
  autoFocus?: boolean;
  rows?: number;
  onSaved?: () => void;
  onPendingChange?: (pending: boolean) => void;
  /** Hide the project picker (e.g. in the compact overview panel). */
  compact?: boolean;
  className?: string;
  /** Lets an external submit button target this form (`form` attribute). */
  formId?: string;
};

/**
 * Textarea + optional project, shared by the capture dialog, the inbox page and
 * the overview. Enter saves, Shift+Enter inserts a new line.
 */
export function CaptureField({
  initialText = "",
  autoFocus,
  rows = 2,
  onSaved,
  onPendingChange,
  compact,
  className,
  formId,
}: CaptureFieldProps) {
  const generatedId = useId();
  const [body, setBody] = useState(initialText);
  const [projectId, setProjectId] = useState("");
  const create = useCreateNote();

  const submit = () => {
    const text = body.trim();
    if (!text || create.isPending) return;
    onPendingChange?.(true);
    create.mutate(
      { body: text, projectId: projectId || null },
      {
        onSuccess: () => {
          setBody("");
          onSaved?.();
        },
        onSettled: () => onPendingChange?.(false),
      },
    );
  };

  return (
    <form
      id={formId ?? generatedId}
      className={cn("flex flex-col gap-2", className)}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        autoFocus={autoFocus}
        rows={rows}
        maxLength={NOTE_MAX_LENGTH}
        placeholder="A thought, a link, a to-do…"
        aria-label="Note"
        className={cn(fieldControl, "resize-none py-2 leading-relaxed")}
      />
      {compact ? null : (
        <div className="w-48">
          <ProjectSelect value={projectId} onChange={setProjectId} />
        </div>
      )}
    </form>
  );
}
