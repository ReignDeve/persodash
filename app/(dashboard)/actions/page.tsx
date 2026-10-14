import type { Metadata } from "next";
import { Suspense } from "react";

import { ActionsView } from "@/features/actions/actions-view";

export const metadata: Metadata = { title: "Actions" };

export default function ActionsPage() {
  return (
    <Suspense>
      <ActionsView />
    </Suspense>
  );
}
