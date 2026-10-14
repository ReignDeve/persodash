import { Fragment } from "react";

import { cn } from "@/lib/utils";

const URL_PATTERN = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

/** Plain text with clickable URLs. Built from React nodes – never innerHTML. */
export function LinkifiedText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(URL_PATTERN);
  return (
    <span className={cn("whitespace-pre-wrap break-words", className)}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-accent underline-offset-2 hover:underline"
          >
            {part.replace(/^https?:\/\//, "").slice(0, 60)}
            {part.replace(/^https?:\/\//, "").length > 60 ? "…" : ""}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </span>
  );
}
