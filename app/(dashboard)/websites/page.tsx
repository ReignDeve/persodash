import type { Metadata } from "next";

import { WebsitesView } from "@/features/websites/websites-view";

export const metadata: Metadata = { title: "Websites" };

export default function WebsitesPage() {
  return <WebsitesView />;
}
