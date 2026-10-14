"use client";

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, type ReactNode } from "react";
import { Toaster, toast } from "sonner";

import { TooltipProvider } from "@/components/ui/tooltip";
import { errorMessage } from "@/lib/api/client";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 20_000,
        retry: 1,
        refetchOnWindowFocus: true,
      },
    },
    // One place for mutation error feedback; mutations can opt out via meta.
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.meta?.silent) return;
        toast.error(errorMessage(error));
      },
    }),
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={400} skipDelayDuration={200}>
          {children}
          <Toaster
            position="bottom-right"
            offset={16}
            mobileOffset={{ bottom: 72 }}
            toastOptions={{
              unstyled: true,
              classNames: {
                toast:
                  "flex w-[356px] max-w-[calc(100vw-32px)] items-center gap-3 rounded-lg bg-overlay px-3.5 py-2.5 text-sm text-fg shadow-[var(--shadow-overlay)]",
                title: "flex-1",
                description: "text-xs text-subtle",
                icon: "[&_svg]:size-4",
                success: "[&_[data-icon]]:text-ok",
                error: "[&_[data-icon]]:text-err",
                actionButton:
                  "ml-auto shrink-0 rounded-sm px-2 py-1 text-xs font-medium text-fg shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-hover",
              },
            }}
          />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: { silent?: boolean };
  }
}
