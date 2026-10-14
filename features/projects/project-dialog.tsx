"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { useAppActions } from "@/components/shell/app-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, fieldA11y } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { queryKeys, useWebsites } from "@/lib/api/queries";
import { useCrud } from "@/lib/hooks/use-crud";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABEL,
  projectInputSchema,
  type ProjectFormValues,
  type ProjectInput,
  type ProjectSummary,
} from "@/lib/schemas/projects";

const FORM_ID = "project-form";
const NO_VERCEL = "__none";

function defaults(p: ProjectSummary | null): ProjectFormValues {
  return {
    name: p?.name ?? "",
    description: p?.description ?? "",
    status: p?.status ?? "active",
    repo: p?.repo ?? "",
    vercelProject: p?.vercelProject ?? "",
    url: p?.url ?? "",
    nextStep: p?.nextStep ?? "",
  };
}

export function ProjectDialog() {
  const { editor, closeEditor } = useAppActions();
  const open = editor?.kind === "project";
  const project = open ? editor.item : null;
  const { save } = useCrud<ProjectInput>({
    endpoint: "/api/projects",
    noun: "Project",
    invalidate: [queryKeys.projects],
  });
  const websites = useWebsites(open);
  const vercelNames = websites.data?.status === "ok" ? websites.data.websites.map((w) => w.name) : [];

  const form = useForm<ProjectFormValues, unknown, ProjectInput>({
    resolver: zodResolver(projectInputSchema),
    defaultValues: defaults(project),
  });
  const { errors } = form.formState;

  useEffect(() => {
    if (open) form.reset(defaults(project));
  }, [open, project, form]);

  const onSubmit = form.handleSubmit((input) => save.mutate({ id: project?.id, input }, { onSuccess: closeEditor }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeEditor()}>
      <DialogContent
        title={project ? "Edit project" : "New project"}
        className="sm:max-w-lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeEditor}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form={FORM_ID} disabled={save.isPending}>
              {project ? "Save changes" : "Create project"}
            </Button>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Name" htmlFor="project-name" error={errors.name?.message}>
            <Input autoFocus {...fieldA11y("project-name", errors.name?.message)} {...form.register("name")} />
          </Field>
          <Field label="Status" htmlFor="project-status">
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Segmented
                  aria-label="Status"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABEL[s] }))}
                  className="self-start"
                />
              )}
            />
          </Field>
          <Field label="Next step" htmlFor="project-next" error={errors.nextStep?.message} hint="The one thing to do next – shown on the overview.">
            <Input
              placeholder="e.g. Ship the share sheet on iOS"
              {...fieldA11y("project-next", errors.nextStep?.message)}
              {...form.register("nextStep")}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="GitHub repository" htmlFor="project-repo" error={errors.repo?.message}>
              <Input
                placeholder="owner/name"
                spellCheck={false}
                className="font-mono text-xs"
                {...fieldA11y("project-repo", errors.repo?.message)}
                {...form.register("repo")}
              />
            </Field>
            <Field label="Vercel project" htmlFor="project-vercel">
              <Controller
                control={form.control}
                name="vercelProject"
                render={({ field }) => (
                  <Select
                    id="project-vercel"
                    value={field.value || NO_VERCEL}
                    onValueChange={(v) => field.onChange(v === NO_VERCEL ? "" : v)}
                    options={[
                      { value: NO_VERCEL, label: "None" },
                      ...vercelNames.map((n) => ({ value: n, label: n })),
                    ]}
                  />
                )}
              />
            </Field>
          </div>
          <Field label="URL" htmlFor="project-url" error={errors.url?.message}>
            <Input
              placeholder="https://"
              spellCheck={false}
              {...fieldA11y("project-url", errors.url?.message)}
              {...form.register("url")}
            />
          </Field>
          <Field label="Description" htmlFor="project-desc" error={errors.description?.message}>
            <Textarea rows={2} {...fieldA11y("project-desc", errors.description?.message)} {...form.register("description")} />
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  );
}
