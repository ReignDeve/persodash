"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CircleDot,
  Download,
  FolderGit2,
  GitCommitHorizontal,
  GitPullRequest,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { useAppActions } from "@/components/shell/app-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, SheetContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { KeyValue } from "@/components/ui/metric";
import { Page, PageHeader } from "@/components/ui/page";
import { Panel } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/states";
import { Status, StatusDot } from "@/components/ui/status";
import { Tooltip } from "@/components/ui/tooltip";
import { PROJECT_TONE } from "@/features/projects/status";
import { siteStatus } from "@/features/websites/status";
import { api } from "@/lib/api/client";
import { queryKeys, useProjects, useSubscriptions } from "@/lib/api/queries";
import { useCrud } from "@/lib/hooks/use-crud";
import { formatEur, formatRelative, hostname } from "@/lib/format";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABEL,
  type ProjectInput,
  type ProjectStatus,
  type ProjectSummary,
  type RepoActivity,
} from "@/lib/schemas/projects";
import type { Website } from "@/lib/schemas/websites";
import { cn } from "@/lib/utils";

type Filter = "open" | "all";

const isRepo = (g: ProjectSummary["github"]): g is RepoActivity => g !== null && !("error" in g);

function deployTone(p: ProjectSummary) {
  if (!p.deployment) return null;
  // Reuse the Websites logic for a consistent verdict.
  return siteStatus({
    deployment: { state: p.deployment.state },
    health: { state: p.deployment.health },
  } as Website);
}

function usePatchProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; status?: ProjectStatus; nextStep?: string }) =>
      api(`/api/projects/${id}`, { method: "PATCH", body: patch }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
  });
}

export function ProjectsView() {
  const params = useSearchParams();
  const { openEditor } = useAppActions();
  const { data, isPending, error, refetch } = useProjects();
  const [filter, setFilter] = useState<Filter>("open");
  // ?project=<id> (from search / overview) opens that project; tracked during
  // render so a new param also works while already on the page.
  const paramId = params.get("project");
  const [selectedId, setSelectedId] = useState<string | null>(paramId);
  const [seenParam, setSeenParam] = useState(paramId);
  if (paramId !== seenParam) {
    setSeenParam(paramId);
    setSelectedId(paramId);
  }
  const [importOpen, setImportOpen] = useState(false);

  const projects = useMemo(
    () => (data?.projects ?? []).filter((p) => filter === "all" || p.status === "active" || p.status === "paused"),
    [data, filter],
  );
  const selected = data?.projects.find((p) => p.id === selectedId) ?? null;

  if (error) {
    return (
      <Page>
        <PageHeader title="Projects" />
        <ErrorState message={error.message} onRetry={() => refetch()} />
      </Page>
    );
  }

  const openCount = data?.projects.filter((p) => p.status === "active" || p.status === "paused").length ?? 0;

  return (
    <Page>
      <PageHeader
        title="Projects"
        description="Repos, deployments, services and costs of everything you are building – in one place."
        actions={
          <>
            {data?.importable.length ? (
              <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)}>
                <Download />
                <span className="hidden sm:inline">Import from Vercel</span>
              </Button>
            ) : null}
            <Button variant="primary" size="sm" onClick={() => openEditor({ kind: "project", item: null })}>
              <Plus />
              New project
            </Button>
          </>
        }
      />

      <Panel>
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
          <Segmented
            aria-label="Show"
            value={filter}
            onValueChange={setFilter}
            options={[
              { value: "open", label: "In progress", count: openCount },
              { value: "all", label: "All", count: data?.projects.length },
            ]}
          />
          {data && !data.github.configured ? (
            <span className="ml-auto text-xs text-subtle">Public repos only · set GITHUB_TOKEN for private ones</span>
          ) : null}
        </div>

        {isPending ? (
          <SkeletonRows rows={5} />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={FolderGit2}
            title={data?.projects.length ? "Nothing in progress" : "No projects yet"}
            description={
              data?.importable.length
                ? `${data.importable.length} Vercel projects can be imported with their GitHub repos.`
                : "Create a project to link its repo, deployment, services and costs."
            }
            action={
              data?.importable.length ? (
                <Button size="sm" variant="primary" onClick={() => setImportOpen(true)}>
                  <Download />
                  Import from Vercel
                </Button>
              ) : null
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {projects.map((p) => (
              <ProjectRow key={p.id} project={p} onOpen={() => setSelectedId(p.id)} />
            ))}
          </ul>
        )}
      </Panel>

      <ProjectSheet project={selected} onClose={() => setSelectedId(null)} />
      {/* Re-mounted on open so the selection starts with everything checked. */}
      <ImportDialog
        key={String(importOpen)}
        open={importOpen}
        onOpenChange={setImportOpen}
        importable={data?.importable ?? []}
      />
    </Page>
  );
}

function ProjectRow({ project: p, onOpen }: { project: ProjectSummary; onOpen: () => void }) {
  const github = isRepo(p.github) ? p.github : null;
  const deploy = deployTone(p);
  const onKey = (e: KeyboardEvent) => e.key === "Enter" && e.target === e.currentTarget && onOpen();

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKey}
      className="grid cursor-pointer gap-x-6 gap-y-2 px-4 py-3 transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:outline-none md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto]"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <StatusDot tone={PROJECT_TONE[p.status]} />
          <span className="truncate text-sm font-medium text-fg">{p.name}</span>
          {p.status !== "active" ? <span className="label">{PROJECT_STATUS_LABEL[p.status]}</span> : null}
        </div>
        <NextStep project={p} />
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        {github ? (
          <Tooltip content={`Last push to ${github.fullName}`}>
            <span className="inline-flex items-center gap-1.5">
              <GitCommitHorizontal className="size-3.5 text-subtle" />
              <span className="font-mono tabular">{formatRelative(github.pushedAt)}</span>
            </span>
          </Tooltip>
        ) : p.github && "error" in p.github ? (
          <span className="inline-flex items-center gap-1.5 text-2xs text-faint">
            <GitCommitHorizontal className="size-3.5" />
            {p.github.error}
          </span>
        ) : null}
        {github && github.openPullRequests > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <GitPullRequest className="size-3.5 text-subtle" />
            <span className="font-mono tabular">{github.openPullRequests}</span>
          </span>
        ) : null}
        {github && github.openIssues > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <CircleDot className="size-3.5 text-subtle" />
            <span className="font-mono tabular">{github.openIssues}</span>
          </span>
        ) : null}
        {deploy ? <Status tone={deploy.tone} label={deploy.label} /> : null}
        {p.monitors.length ? (
          <Tooltip content={p.monitors.map((m) => `${m.name}: ${m.up === null ? "–" : m.up ? "up" : "down"}`).join(" · ")}>
            <span className="inline-flex items-center gap-1">
              {p.monitors.map((m) => (
                <StatusDot key={m.id} tone={m.up === null ? "idle" : m.up ? "ok" : "err"} />
              ))}
            </span>
          </Tooltip>
        ) : null}
      </div>

      <div className="flex items-center gap-4 md:justify-end">
        {p.monthlyCostEur ? (
          <span className="font-mono text-xs text-muted tabular">{formatEur(p.monthlyCostEur)}/mo</span>
        ) : null}
        <span className="font-mono text-2xs text-subtle tabular">{formatRelative(p.lastActivityAt)}</span>
      </div>
    </li>
  );
}

/** Inline-editable next step: click, type, Enter. */
function NextStep({ project }: { project: ProjectSummary }) {
  const patch = usePatchProject();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(project.nextStep ?? "");

  const commit = () => {
    setEditing(false);
    if (value.trim() !== (project.nextStep ?? "")) patch.mutate({ id: project.id, nextStep: value.trim() });
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        maxLength={200}
        aria-label="Next step"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setValue(project.nextStep ?? "");
            setEditing(false);
          }
        }}
        className="mt-1 w-full rounded-sm bg-bg px-1.5 py-0.5 text-xs text-fg shadow-[inset_0_0_0_1px_var(--accent)] outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setValue(project.nextStep ?? "");
        setEditing(true);
      }}
      className={cn(
        "mt-1 block max-w-full truncate rounded-sm px-1.5 py-0.5 -mx-1.5 text-left text-xs transition-colors hover:bg-selected",
        project.nextStep ? "text-muted" : "text-faint",
      )}
    >
      {project.nextStep ? `→ ${project.nextStep}` : "Add next step"}
    </button>
  );
}

function ProjectSheet({ project, onClose }: { project: ProjectSummary | null; onClose: () => void }) {
  const { openEditor } = useAppActions();
  const patch = usePatchProject();
  const subscriptions = useSubscriptions();
  const { remove } = useCrud<ProjectInput>({ endpoint: "/api/projects", noun: "Project", invalidate: [queryKeys.projects] });

  const github = project && isRepo(project.github) ? project.github : null;
  const subs = subscriptions.data?.items.filter((s) => s.project?.id === project?.id) ?? [];

  return (
    <Dialog open={project !== null} onOpenChange={(o) => !o && onClose()}>
      {project ? (
        <SheetContent title={project.name} className="max-w-lg">
          <div className="flex items-center gap-2 border-b px-4 py-2.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <StatusDot tone={PROJECT_TONE[project.status]} />
                  {PROJECT_STATUS_LABEL[project.status]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                {PROJECT_STATUSES.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    icon={<StatusDot tone={PROJECT_TONE[s]} />}
                    onSelect={() => patch.mutate({ id: project.id, status: s })}
                    shortcut={s === project.status ? "●" : undefined}
                  >
                    {PROJECT_STATUS_LABEL[s]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="ml-auto flex items-center gap-1">
              {project.url ? (
                <Button variant="ghost" size="icon-sm" asChild aria-label="Open site">
                  <a href={project.url} target="_blank" rel="noopener noreferrer">
                    <ArrowUpRight />
                  </a>
                </Button>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Project actions">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem icon={<Pencil />} onSelect={() => openEditor({ kind: "project", item: project })}>
                    Edit project
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    icon={<Trash2 />}
                    destructive
                    onSelect={() => remove.mutate(project.id, { onSuccess: onClose })}
                  >
                    Delete project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex flex-col gap-6 px-4 py-4">
            {project.description ? <p className="text-sm text-muted">{project.description}</p> : null}

            <section>
              <div className="label mb-1.5">Next step</div>
              <NextStep project={project} />
            </section>

            <section>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="label">Repository</span>
                {github ? (
                  <a href={github.htmlUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-2xs text-subtle hover:text-fg">
                    {github.fullName} ↗
                  </a>
                ) : null}
              </div>
              {github ? (
                <>
                  <div className="mb-2 flex gap-4 font-mono text-xs text-muted tabular">
                    <span>{github.openPullRequests} open PRs</span>
                    <span>{github.openIssues} issues</span>
                    <span>{github.defaultBranch}</span>
                  </div>
                  <ul className="divide-y divide-line rounded-md shadow-[inset_0_0_0_1px_var(--line)]">
                    {github.commits.map((c) => (
                      <li key={c.sha}>
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-hover"
                        >
                          <span className="font-mono text-2xs text-subtle">{c.sha}</span>
                          <span className="min-w-0 flex-1 truncate text-xs text-fg">{c.message}</span>
                          <span className="shrink-0 font-mono text-2xs text-subtle">{formatRelative(c.date)}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-xs text-subtle">
                  {project.github && "error" in project.github ? project.github.error : "No repository linked."}
                </p>
              )}
            </section>

            <section>
              <div className="label mb-1.5">Deployment</div>
              <dl className="divide-y divide-line">
                <KeyValue label="Vercel">{project.vercelProject ?? "–"}</KeyValue>
                {project.deployment ? (
                  <>
                    <KeyValue label="Status">
                      <Status {...deployTone(project)!} />
                    </KeyValue>
                    <KeyValue label="Deployed" mono>{formatRelative(project.deployment.createdAt)}</KeyValue>
                  </>
                ) : null}
                {project.url ? <KeyValue label="URL" mono>{hostname(project.url)}</KeyValue> : null}
              </dl>
            </section>

            <section>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="label">Services</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditor({ kind: "monitor", item: null, projectId: project.id })}
                >
                  <Plus />
                  Monitor
                </Button>
              </div>
              {project.monitors.length ? (
                <ul className="flex flex-col gap-1.5">
                  {project.monitors.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 text-sm text-fg">
                      <StatusDot tone={m.up === null ? "idle" : m.up ? "ok" : "err"} />
                      {m.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-subtle">No services monitored for this project.</p>
              )}
            </section>

            <section>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="label">Costs</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditor({ kind: "subscription", item: null, projectId: project.id })}
                >
                  <Plus />
                  Subscription
                </Button>
              </div>
              {subs.length ? (
                <ul className="divide-y divide-line">
                  {subs.map((s) => (
                    <li key={s.id} className="flex items-center justify-between py-1.5 text-sm">
                      <span className="text-fg">{s.name}</span>
                      <span className="font-mono text-xs text-muted tabular">{formatEur(s.monthlyEur)}/mo</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-subtle">No costs linked.</p>
              )}
            </section>
          </div>
        </SheetContent>
      ) : null}
    </Dialog>
  );
}

function ImportDialog({
  open,
  onOpenChange,
  importable,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importable: { name: string; repo: string | null; url: string | null }[];
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>(() => importable.map((i) => i.name));

  const run = useMutation({
    mutationFn: () => api<{ created: number }>("/api/projects/import", { method: "POST", body: { names: selected } }),
    onSuccess: (r) => {
      toast.success(`Imported ${r.created} project${r.created === 1 ? "" : "s"}`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      onOpenChange(false);
    },
  });

  const toggle = (name: string) =>
    setSelected((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Import from Vercel"
        description="Creates a project per Vercel project, linked to its GitHub repo and domain."
        footer={
          <>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!selected.length || run.isPending} onClick={() => run.mutate()}>
              Import {selected.length}
            </Button>
          </>
        }
      >
        <ul className="divide-y divide-line rounded-md shadow-[inset_0_0_0_1px_var(--line)]">
          {importable.map((i) => (
            <li key={i.name}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-hover">
                <input
                  type="checkbox"
                  checked={selected.includes(i.name)}
                  onChange={() => toggle(i.name)}
                  className="size-3.5 accent-[var(--fg)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">{i.name}</span>
                  <span className="block truncate font-mono text-2xs text-subtle">
                    {i.repo ?? "no repo"} · {hostname(i.url) ?? "no domain"}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
