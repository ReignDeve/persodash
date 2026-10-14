"use client";

// Phantom only supplies the public address here – PersoDash never asks the
// wallet to sign anything.

type PhantomProvider = {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString(): string } }>;
};

declare global {
  interface Window {
    phantom?: { solana?: PhantomProvider };
    solana?: PhantomProvider;
  }
}

export function getPhantom(): PhantomProvider | null {
  if (typeof window === "undefined") return null;
  const provider = window.phantom?.solana ?? window.solana;
  return provider?.isPhantom ? provider : null;
}

export async function readPhantomAddress(): Promise<string> {
  const provider = getPhantom();
  if (!provider) throw new Error("Phantom is not installed in this browser");
  const { publicKey } = await provider.connect();
  return publicKey.toString();
}
