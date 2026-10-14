"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { useAppActions } from "@/components/shell/app-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, fieldA11y } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ProjectSelect } from "@/components/ui/project-select";
import { Switch } from "@/components/ui/switch";
import { queryKeys } from "@/lib/api/queries";
import { useCrud } from "@/lib/hooks/use-crud";
import {
  monitorInputSchema,
  type MonitorFormValues,
  type MonitorInput,
  type MonitorSummary,
} from "@/lib/schemas/services";

const FORM_ID = "monitor-form";

function defaults(m: MonitorSummary | null, projectId?: string): MonitorFormValues {
  return {
    name: m?.name ?? "",
    url: m?.url ?? "",
    expectedStatus: m?.expectedStatus ?? "",
    projectId: m?.project?.id ?? projectId ?? "",
    enabled: m?.enabled ?? true,
  };
}

export function MonitorDialog() {
  const { editor, closeEditor } = useAppActions();
  const open = editor?.kind === "monitor";
  const monitor = open ? editor.item : null;
  const presetProject = open ? editor.projectId : undefined;
  const { save } = useCrud<MonitorInput>({
    endpoint: "/api/services",
    noun: "Service",
    invalidate: [queryKeys.services, queryKeys.projects],
  });

  const form = useForm<MonitorFormValues, unknown, MonitorInput>({
    resolver: zodResolver(monitorInputSchema),
    defaultValues: defaults(monitor, presetProject),
  });
  const { errors } = form.formState;

  useEffect(() => {
    if (open) form.reset(defaults(monitor, presetProject));
  }, [open, monitor, presetProject, form]);

  const onSubmit = form.handleSubmit((input) => save.mutate({ id: monitor?.id, input }, { onSuccess: closeEditor }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeEditor()}>
      <DialogContent
        title={monitor ? "Edit service" : "Monitor a service"}
        description="Checked every 2 minutes from this server. You get a notification when it goes down and when it recovers."
        footer={
          <>
            <Button variant="ghost" onClick={closeEditor}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form={FORM_ID} disabled={save.isPending}>
              {save.isPending ? "Checking…" : monitor ? "Save changes" : "Start monitoring"}
            </Button>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Name" htmlFor="monitor-name" error={errors.name?.message}>
            <Input
              autoFocus
              placeholder="e.g. LUCY API"
              {...fieldA11y("monitor-name", errors.name?.message)}
              {...form.register("name")}
            />
          </Field>
          <Field label="URL" htmlFor="monitor-url" error={errors.url?.message} hint="A health endpoint is ideal, e.g. /health.">
            <Input
              placeholder="https://"
              spellCheck={false}
              className="font-mono text-xs"
              {...fieldA11y("monitor-url", errors.url?.message)}
              {...form.register("url")}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Expected status" htmlFor="monitor-status" error={errors.expectedStatus?.message} hint="Empty = any status below 400">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="200"
                className="font-mono"
                {...fieldA11y("monitor-status", errors.expectedStatus?.message)}
                {...form.register("expectedStatus")}
              />
            </Field>
            <Field label="Project" htmlFor="monitor-project">
              <Controller
                control={form.control}
                name="projectId"
                render={({ field }) => <ProjectSelect id="monitor-project" value={field.value} onChange={field.onChange} />}
              />
            </Field>
          </div>
          <label className="flex items-center justify-between gap-4 text-sm">
            <span>
              <span className="block text-fg">Active</span>
              <span className="block text-xs text-subtle">Paused services are not checked and never alert.</span>
            </span>
            <Controller
              control={form.control}
              name="enabled"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
          </label>
        </form>
      </DialogContent>
    </Dialog>
  );
}
