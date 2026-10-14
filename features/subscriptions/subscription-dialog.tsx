"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addMonths, format } from "date-fns";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { useAppActions } from "@/components/shell/app-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, fieldA11y } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ProjectSelect } from "@/components/ui/project-select";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { queryKeys } from "@/lib/api/queries";
import { useCrud } from "@/lib/hooks/use-crud";
import {
  BILLING_CYCLES,
  CURRENCIES,
  CYCLE_LABEL,
  SUBSCRIPTION_CATEGORIES,
  subscriptionInputSchema,
  type SubscriptionFormValues,
  type SubscriptionInput,
  type SubscriptionItem,
} from "@/lib/schemas/subscriptions";

const FORM_ID = "subscription-form";
const REMIND_OPTIONS = [0, 1, 3, 7, 14, 30];

function defaults(s: SubscriptionItem | null, projectId?: string): SubscriptionFormValues {
  return {
    name: s?.name ?? "",
    amount: s ? s.amountCents / 100 : ("" as unknown as number),
    currency: s?.currency ?? "EUR",
    cycle: s?.cycle ?? "monthly",
    nextRenewal: s?.nextRenewal ?? format(addMonths(new Date(), 1), "yyyy-MM-dd"),
    category: s?.category ?? "Software",
    remindDays: s?.remindDays ?? 7,
    url: s?.url ?? "",
    projectId: s?.project?.id ?? projectId ?? "",
    active: s?.active ?? true,
  };
}

export function SubscriptionDialog() {
  const { editor, closeEditor } = useAppActions();
  const open = editor?.kind === "subscription";
  const item = open ? editor.item : null;
  const presetProject = open ? editor.projectId : undefined;
  const { save } = useCrud<SubscriptionInput>({
    endpoint: "/api/subscriptions",
    noun: "Subscription",
    invalidate: [queryKeys.subscriptions, queryKeys.projects],
  });

  const form = useForm<SubscriptionFormValues, unknown, SubscriptionInput>({
    resolver: zodResolver(subscriptionInputSchema),
    defaultValues: defaults(item, presetProject),
  });
  const { errors } = form.formState;

  useEffect(() => {
    if (open) form.reset(defaults(item, presetProject));
  }, [open, item, presetProject, form]);

  const onSubmit = form.handleSubmit((input) => save.mutate({ id: item?.id, input }, { onSuccess: closeEditor }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeEditor()}>
      <DialogContent
        title={item ? "Edit subscription" : "Add subscription"}
        className="sm:max-w-lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeEditor}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form={FORM_ID} disabled={save.isPending}>
              {item ? "Save changes" : "Add subscription"}
            </Button>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Name" htmlFor="sub-name" error={errors.name?.message}>
            <Input
              autoFocus
              placeholder="e.g. Hetzner VPS, enquso.de domain"
              {...fieldA11y("sub-name", errors.name?.message)}
              {...form.register("name")}
            />
          </Field>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <Field label="Price" htmlFor="sub-amount" error={errors.amount?.message}>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                placeholder="0,00"
                className="font-mono"
                {...fieldA11y("sub-amount", errors.amount?.message)}
                {...form.register("amount")}
              />
            </Field>
            <Field label="Currency" htmlFor="sub-currency">
              <Controller
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <Select
                    id="sub-currency"
                    className="w-24"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                  />
                )}
              />
            </Field>
          </div>
          <Field label="Billing" htmlFor="sub-cycle">
            <Controller
              control={form.control}
              name="cycle"
              render={({ field }) => (
                <Segmented
                  aria-label="Billing cycle"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={BILLING_CYCLES.map((c) => ({ value: c, label: CYCLE_LABEL[c] }))}
                  className="self-start"
                />
              )}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Next renewal" htmlFor="sub-renewal" error={errors.nextRenewal?.message}>
              <Input type="date" {...fieldA11y("sub-renewal", errors.nextRenewal?.message)} {...form.register("nextRenewal")} />
            </Field>
            <Field label="Remind me" htmlFor="sub-remind">
              <Controller
                control={form.control}
                name="remindDays"
                render={({ field }) => (
                  <Select
                    id="sub-remind"
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                    options={REMIND_OPTIONS.map((d) => ({
                      value: String(d),
                      label: d === 0 ? "Never" : `${d} day${d === 1 ? "" : "s"} before`,
                    }))}
                  />
                )}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category" htmlFor="sub-category">
              <Controller
                control={form.control}
                name="category"
                render={({ field }) => (
                  <Select
                    id="sub-category"
                    value={field.value ?? "Other"}
                    onValueChange={field.onChange}
                    options={SUBSCRIPTION_CATEGORIES.map((c) => ({ value: c, label: c }))}
                  />
                )}
              />
            </Field>
            <Field label="Project" htmlFor="sub-project">
              <Controller
                control={form.control}
                name="projectId"
                render={({ field }) => <ProjectSelect id="sub-project" value={field.value} onChange={field.onChange} />}
              />
            </Field>
          </div>
          <Field label="Manage URL" htmlFor="sub-url" error={errors.url?.message} hint="Where to cancel or change it.">
            <Input
              placeholder="https://"
              spellCheck={false}
              {...fieldA11y("sub-url", errors.url?.message)}
              {...form.register("url")}
            />
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  );
}
