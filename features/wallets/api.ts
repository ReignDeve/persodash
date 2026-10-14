"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/queries";
import type { WalletInput, WalletsResponse } from "@/lib/schemas/wallets";

function useInvalidateWallets() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.wallets });
    void queryClient.invalidateQueries({ queryKey: queryKeys.activity });
  };
}

export function useCreateWallet() {
  const invalidate = useInvalidateWallets();
  return useMutation({
    mutationFn: (input: WalletInput) => api("/api/wallets", { method: "POST", body: input }),
    onSuccess: (_d, input) => {
      toast.success(`Added ${input.label}`);
      invalidate();
    },
  });
}

export function useRenameWallet() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateWallets();
  return useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) =>
      api(`/api/wallets/${id}`, { method: "PATCH", body: { label } }),
    // Optimistic: rename in place.
    onMutate: ({ id, label }) => {
      const prev = queryClient.getQueryData<WalletsResponse>(queryKeys.wallets);
      queryClient.setQueryData<WalletsResponse>(queryKeys.wallets, (old) =>
        old ? { ...old, wallets: old.wallets.map((w) => (w.id === id ? { ...w, label } : w)) } : old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(queryKeys.wallets, ctx?.prev),
    onSettled: invalidate,
  });
}

export function useDeleteWallet() {
  const invalidate = useInvalidateWallets();
  return useMutation({
    mutationFn: (id: string) => api(`/api/wallets/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Wallet removed");
      invalidate();
    },
  });
}
