"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-4 text-center">
      <span className="label">Error</span>
      <h1 className="text-lg font-medium">Something went wrong</h1>
      <p className="max-w-sm text-sm text-subtle">
        The page failed to render.
        {error.digest ? <span className="mt-1 block font-mono text-2xs text-faint">ref {error.digest}</span> : null}
      </p>
      <Button size="sm" onClick={reset} className="mt-2">
        Try again
      </Button>
    </div>
  );
}
