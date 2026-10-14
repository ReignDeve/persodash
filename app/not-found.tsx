import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <span className="font-mono text-xs text-subtle">404</span>
      <h1 className="text-lg font-medium">Nothing here</h1>
      <p className="text-sm text-subtle">This page doesn’t exist.</p>
      <Button size="sm" asChild className="mt-2">
        <Link href="/">Back to overview</Link>
      </Button>
    </div>
  );
}
