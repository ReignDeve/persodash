"use client";

import { useState } from "react";

import { useAppActions } from "@/components/shell/app-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { CaptureField } from "@/features/inbox/capture-field";

const FORM_ID = "capture-dialog-form";

/** Global quick capture (key N, ⌘K → "Capture …", mobile +). */
export function CaptureDialog() {
  const { capture, closeCapture } = useAppActions();

  return (
    <Dialog open={capture.open} onOpenChange={(o) => !o && closeCapture()}>
      <DialogContent title="Capture" description="Anything – sort it later in the inbox.">
        {/* Re-mounted per open so it starts with the passed-in text. */}
        {capture.open ? <CaptureBody initialText={capture.text} onDone={closeCapture} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function CaptureBody({ initialText, onDone }: { initialText: string; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <CaptureField
        formId={FORM_ID}
        initialText={initialText}
        autoFocus
        onSaved={onDone}
        onPendingChange={setPending}
        rows={4}
      />
      <div className="flex items-center justify-between text-2xs text-subtle">
        <span className="flex items-center gap-1.5">
          <Kbd>↵</Kbd> save · <Kbd>⇧↵</Kbd> new line
        </span>
        <Button type="submit" form={FORM_ID} variant="primary" size="sm" disabled={pending}>
          Save
        </Button>
      </div>
    </div>
  );
}
