"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { useAppActions } from "@/components/shell/app-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, fieldA11y } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { ProjectSelect } from "@/components/ui/project-select";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { queryKeys } from "@/lib/api/queries";
import { useCrud } from "@/lib/hooks/use-crud";
import {
  CADENCES,
  CADENCE_LABEL,
  cadenceLabel,
  routineInputSchema,
  type RoutineFormValues,
  type RoutineInput,
  type RoutineItem,
} from "@/lib/schemas/routines";

const FORM_ID = "routine-form";

function defaults(r: RoutineItem | null, preset?: Partial<RoutineItem>): RoutineFormValues {
  const base = r ?? preset;
  return {
    title: base?.title ?? "",
    notes: base?.notes ?? "",
    cadence: base?.cadence ?? "weekly",
    interval: base?.interval ?? 1,
    nextDue: r?.nextDue ?? format(new Date(), "yyyy-MM-dd"),
    remind: r?.remind ?? true,
    active: r?.active ?? true,
    projectId: r?.project?.id ?? "",
  };
}

export function RoutineDialog() {
  const { editor, closeEditor } = useAppActions();
  const open = editor?.kind === "routine";
  const routine = open ? editor.item : null;
  const preset = open ? editor.preset : undefined;
  const { save } = useCrud<RoutineInput>({ endpoint: "/api/routines", noun: "Routine", invalidate: [queryKeys.routines] });

  const form = useForm<RoutineFormValues, unknown, RoutineInput>({
    resolver: zodResolver(routineInputSchema),
    defaultValues: defaults(routine, preset),
  });
  const { errors } = form.formState;
  const [cadence, interval] = useWatch({ control: form.control, name: ["cadence", "interval"] });

  useEffect(() => {
    if (open) form.reset(defaults(routine, preset));
  }, [open, routine, preset, form]);

  const onSubmit = form.handleSubmit((input) => save.mutate({ id: routine?.id, input }, { onSuccess: closeEditor }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeEditor()}>
      <DialogContent
        title={routine ? "Edit routine" : "New routine"}
        description="Reschedules itself every time you mark it done."
        footer={
          <>
            <Button variant="ghost" onClick={closeEditor}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form={FORM_ID} disabled={save.isPending}>
              {routine ? "Save changes" : "Create routine"}
            </Button>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Task" htmlFor="routine-title" error={errors.title?.message}>
            <Input
              placeholder="e.g. Check VPS backups"
              {...fieldA11y("routine-title", errors.title?.message)}
              {...form.register("title")}
            />
          </Field>
          <Field label="Repeats" htmlFor="routine-cadence" hint={cadenceLabel(cadence, Number(interval) || 1)}>
            <div className="flex flex-wrap items-center gap-2">
              <Controller
                control={form.control}
                name="cadence"
                render={({ field }) => (
                  <Segmented
                    aria-label="Cadence"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={CADENCES.map((c) => ({ value: c, label: CADENCE_LABEL[c] }))}
                  />
                )}
              />
              <span className="text-xs text-subtle">every</span>
              <Input
                type="number"
                min={1}
                max={52}
                inputMode="numeric"
                aria-label="Interval"
                className="h-7 w-14 font-mono text-xs"
                {...form.register("interval")}
              />
            </div>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={routine ? "Next due" : "First due"} htmlFor="routine-due" error={errors.nextDue?.message}>
              <Input type="date" {...fieldA11y("routine-due", errors.nextDue?.message)} {...form.register("nextDue")} />
            </Field>
            <Field label="Project" htmlFor="routine-project">
              <Controller
                control={form.control}
                name="projectId"
                render={({ field }) => <ProjectSelect id="routine-project" value={field.value} onChange={field.onChange} />}
              />
            </Field>
          </div>
          <Field label="Notes" htmlFor="routine-notes" hint="How to do it – shown in the reminder.">
            <Textarea rows={2} {...fieldA11y("routine-notes", errors.notes?.message)} {...form.register("notes")} />
          </Field>
          <label className="flex items-center justify-between gap-4 text-sm">
            <span>
              <span className="block text-fg">Remind me when due</span>
              <span className="block text-xs text-subtle">Notification and Telegram on the due date.</span>
            </span>
            <Controller
              control={form.control}
              name="remind"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
          </label>
        </form>
      </DialogContent>
    </Dialog>
  );
}
