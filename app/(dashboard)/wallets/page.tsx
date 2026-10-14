import type { Metadata } from "next";

import { WalletsView } from "@/features/wallets/wallets-view";

export const metadata: Metadata = { title: "Wallets" };

export default function WalletsPage() {
  return <WalletsView />;
}
