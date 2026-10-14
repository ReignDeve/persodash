import type { Metadata } from "next";

import { MinerView } from "@/features/miner/miner-view";

export const metadata: Metadata = { title: "Miner" };

export default function MinerPage() {
  return <MinerView />;
}
