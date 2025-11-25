"use client";

import type { ThemeProviderProps } from "next-themes";

import * as React from "react";
import { HeroUIProvider } from "@heroui/system";
import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// ⬇️ neu: OnchainKit
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { base } from "viem/chains"; // oder mainnet, je nachdem was du willst

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NonNullable<
      Parameters<ReturnType<typeof useRouter>["push"]>[1]
    >;
  }
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();

  return (
     <HeroUIProvider navigate={router.push}>
      <OnchainKitProvider
        apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
        chain={base}
        config={{
          appearance: {
            mode: "auto", // passt sich deinem Theme an
          },
          wallet: {
            display: "modal", // Wallet-UI als Modal
          },
        }}
      >
        <NextThemesProvider {...themeProps}>{children}</NextThemesProvider>
      </OnchainKitProvider>
    </HeroUIProvider>
  );
}
