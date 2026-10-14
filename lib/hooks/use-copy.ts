"use client";

import { toast } from "sonner";

export function copyToClipboard(text: string, label = "Copied to clipboard") {
  navigator.clipboard.writeText(text).then(
    () => toast.success(label),
    () => toast.error("Clipboard is not available"),
  );
}
