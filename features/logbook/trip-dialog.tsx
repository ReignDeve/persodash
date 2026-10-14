"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

import { useAppActions } from "@/components/shell/app-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, fieldA11y } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { useSaveTrip } from "@/features/logbook/api";
import { useLogbook } from "@/lib/api/queries";
import {
  TRIP_TYPES,
  TRIP_TYPE_LABEL,
  tripInputSchema,
  type Trip,
  type TripFormValues,
  type TripInput,
} from "@/lib/schemas/logbook";

const FORM_ID = "trip-form";
const MAX_TEMPLATES = 4;

type Template = Pick<TripInput, "description" | "kilometers" | "type">;

/** Most frequent description/distance/type combinations – trips tend to repeat. */
function useTemplates(enabled: boolean): Template[] {
  // Only fetched once the dialog opens.
  const { data } = useLogbook(undefined, { enabled });
  return useMemo(() => {
    const counts = new Map<string, { template: Template; count: number }>();
    for (const t of data?.trips ?? []) {
      const key = `${t.description}|${t.kilometers}|${t.type}`;
      const entry = counts.get(key) ?? { template: { description: t.description, kilometers: t.kilometers, type: t.type }, count: 0 };
      entry.count++;
      counts.set(key, entry);
    }
    return [...counts.values()]
      .filter((e) => e.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_TEMPLATES)
      .map((e) => e.template);
  }, [data]);
}

function defaults(trip: Trip | null): TripFormValues {
  return trip
    ? { date: trip.date, kilometers: trip.kilometers, description: trip.description, type: trip.type }
    : { date: format(new Date(), "yyyy-MM-dd"), kilometers: "" as unknown as number, description: "", type: "business" };
}

/** Create/edit trip. Mounted once in the shell; opened from anywhere via useAppActions. */
export function TripDialog() {
  const { tripDialog, closeTripDialog } = useAppActions();
  const { open, trip } = tripDialog;
  const save = useSaveTrip();
  const templates = useTemplates(open);

  const form = useForm<TripFormValues, unknown, TripInput>({
    resolver: zodResolver(tripInputSchema),
    defaultValues: defaults(trip),
  });
  const { errors } = form.formState;

  useEffect(() => {
    if (open) form.reset(defaults(trip));
  }, [open, trip, form]);

  const onSubmit = form.handleSubmit((input) =>
    save.mutate({ id: trip?.id, input }, { onSuccess: closeTripDialog }),
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeTripDialog()}>
      <DialogContent
        title={trip ? "Edit trip" : "Log trip"}
        footer={
          <>
            <Button variant="ghost" onClick={closeTripDialog}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form={FORM_ID} disabled={save.isPending}>
              {save.isPending ? "Saving…" : trip ? "Save changes" : "Log trip"}
            </Button>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {!trip && templates.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">Frequent</span>
              <div className="flex flex-wrap gap-1.5">
                {templates.map((t) => (
                  <button
                    key={`${t.description}-${t.kilometers}-${t.type}`}
                    type="button"
                    onClick={() => {
                      form.setValue("description", t.description, { shouldValidate: true });
                      form.setValue("kilometers", t.kilometers, { shouldValidate: true });
                      form.setValue("type", t.type);
                    }}
                    className="inline-flex h-7 items-center gap-2 rounded-md px-2.5 text-xs text-muted shadow-[inset_0_0_0_1px_var(--line-strong)] transition-colors hover:bg-hover hover:text-fg"
                  >
                    {t.description}
                    <span className="font-mono text-2xs text-subtle tabular">{t.kilometers} km</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <Field label="Type" htmlFor="trip-type">
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Segmented
                  aria-label="Trip type"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={TRIP_TYPES.map((t) => ({ value: t, label: TRIP_TYPE_LABEL[t] }))}
                  className="self-start"
                />
              )}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" htmlFor="trip-date" error={errors.date?.message}>
              <Input type="date" {...fieldA11y("trip-date", errors.date?.message)} {...form.register("date")} />
            </Field>
            <Field label="Distance (km)" htmlFor="trip-km" error={errors.kilometers?.message}>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                placeholder="0"
                data-autofocus
                className="font-mono tabular"
                {...fieldA11y("trip-km", errors.kilometers?.message)}
                {...form.register("kilometers")}
              />
            </Field>
          </div>
          <Field label="Description" htmlFor="trip-desc" error={errors.description?.message}>
            <Input
              placeholder="e.g. Office, University, Client visit"
              autoComplete="off"
              {...fieldA11y("trip-desc", errors.description?.message)}
              {...form.register("description")}
            />
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  );
}
