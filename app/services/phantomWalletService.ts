// app/services/phantomWalletService.ts
import type { PublicKey } from "@solana/web3.js";

export type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: PublicKey;
  isConnected?: boolean;
  connect: (opts?: {
    onlyIfTrusted?: boolean;
  }) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
};

declare global {
  interface Window {
    solana?: PhantomProvider;
    phantom?: { solana?: PhantomProvider };
  }
}

export function getPhantomProvider(): PhantomProvider | null {
  if (typeof window === "undefined") return null;
  const provider = window.solana ?? window.phantom?.solana;
  return provider?.isPhantom ? provider : null;
}

export async function connectPhantomWallet(): Promise<string | null> {
  const provider = getPhantomProvider();
  if (!provider) {
    alert(
      "Phantom Wallet not found. Please install it from https://phantom.app/"
    );
    return null;
  }

  try {
    const res = await provider.connect();
    return res.publicKey.toString();
  } catch (e) {
    console.error("Phantom connect error", e);
    return null;
  }
}
