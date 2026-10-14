import type { Metadata } from "next";
import { Suspense } from "react";

import { RoutinesView } from "@/features/routines/routines-view";

export const metadata: Metadata = { title: "Routines" };

export default function RoutinesPage() {
  return (
    <Suspense>
      <RoutinesView />
    </Suspense>
  );
}
