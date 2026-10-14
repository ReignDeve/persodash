"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { useAppActions } from "@/components/shell/app-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, fieldA11y } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { useCreateWallet } from "@/features/wallets/api";
import { getPhantom, readPhantomAddress } from "@/features/wallets/phantom";
import { CHAIN_META, WALLET_CHAINS, walletInputSchema, type WalletInput } from "@/lib/schemas/wallets";

const FORM_ID = "wallet-form";
const EMPTY: WalletInput = { label: "", chain: "bitcoin", address: "" };

/** Add a watch-only wallet (public address only). */
export function WalletDialog() {
  const { walletDialogOpen, setWalletDialogOpen } = useAppActions();
  const create = useCreateWallet();

  const form = useForm<WalletInput>({ resolver: zodResolver(walletInputSchema), defaultValues: EMPTY });
  const { errors } = form.formState;
  const chain = useWatch({ control: form.control, name: "chain" });

  useEffect(() => {
    if (walletDialogOpen) {
      form.reset(EMPTY);
    }
  }, [walletDialogOpen, form]);

  const importFromPhantom = async () => {
    try {
      const address = await readPhantomAddress();
      form.setValue("address", address, { shouldValidate: true });
      if (!form.getValues("label")) form.setValue("label", "Phantom");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  // Only evaluated while open (client-side), so there is no hydration mismatch.
  const hasPhantom = walletDialogOpen && getPhantom() !== null;

  const close = () => setWalletDialogOpen(false);
  const onSubmit = form.handleSubmit((input) => create.mutate(input, { onSuccess: close }));

  return (
    <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
      <DialogContent
        title="Add wallet"
        description="Watch-only: PersoDash stores the public address, never keys."
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form={FORM_ID} disabled={create.isPending}>
              {create.isPending ? "Adding…" : "Add wallet"}
            </Button>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Network" htmlFor="wallet-chain">
            <Controller
              control={form.control}
              name="chain"
              render={({ field }) => (
                <Segmented
                  aria-label="Network"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={WALLET_CHAINS.map((c) => ({ value: c, label: CHAIN_META[c].label }))}
                  className="self-start"
                />
              )}
            />
          </Field>
          <Field label="Name" htmlFor="wallet-label" error={errors.label?.message}>
            <Input
              placeholder="e.g. Cold storage"
              autoComplete="off"
              autoFocus
              {...fieldA11y("wallet-label", errors.label?.message)}
              {...form.register("label")}
            />
          </Field>
          <Field
            label="Address"
            htmlFor="wallet-address"
            error={errors.address?.message}
            hint={
              chain === "solana" && hasPhantom ? (
                <button type="button" onClick={importFromPhantom} className="text-accent hover:underline">
                  Use address from Phantom
                </button>
              ) : undefined
            }
          >
            <Input
              placeholder={chain === "bitcoin" ? "bc1q…" : "Base58 address"}
              autoComplete="off"
              spellCheck={false}
              className="font-mono text-xs"
              {...fieldA11y("wallet-address", errors.address?.message)}
              {...form.register("address")}
            />
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  );
}
