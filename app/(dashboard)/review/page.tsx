import type { Metadata } from "next";
import { Suspense } from "react";

import { ReviewView } from "@/features/review/review-view";

export const metadata: Metadata = { title: "Weekly review" };

export default function ReviewPage() {
  return (
    <Suspense>
      <ReviewView />
    </Suspense>
  );
}
