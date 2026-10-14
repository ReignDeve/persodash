import type { Metadata } from "next";
import { Suspense } from "react";

import { LogbookView } from "@/features/logbook/logbook-view";

export const metadata: Metadata = { title: "Logbook" };

export default function LogbookPage() {
  return (
    <Suspense>
      <LogbookView />
    </Suspense>
  );
}
