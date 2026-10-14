"use client";

import {
  ArrowRightToLine,
  Check,
  FolderGit2,
  Inbox,
  MoreHorizontal,
  Pin,
  PinOff,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { fieldControl } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { LinkifiedText } from "@/components/ui/linkified-text";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { Page, PageHeader } from "@/components/ui/page";
import { Panel } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/states";
import { Tooltip } from "@/components/ui/tooltip";
import { useDeleteNote, usePromoteNote, useUpdateNote } from "@/features/inbox/api";
import { CaptureField } from "@/features/inbox/capture-field";
import { useNotes, useProjectOptions } from "@/lib/api/queries";
import { formatRelative } from "@/lib/format";
import { NOTE_MAX_LENGTH, type NoteFilter, type NoteItem } from "@/lib/schemas/notes";
import { cn } from "@/lib/utils";

export function InboxView() {
  const params = useSearchParams();
  const highlightId = params.get("note");
  const [filter, setFilter] = useState<NoteFilter>("open");
  const { data, isPending, error, refetch } = useNotes(filter);

  useEffect(() => {
    if (highlightId && data) document.getElementById(`note-${highlightId}`)?.scrollIntoView({ block: "center" });
  }, [highlightId, data]);

  if (error) {
    return (
      <Page className="max-w-4xl">
        <PageHeader title="Inbox" />
        <ErrorState message={error.message} onRetry={() => refetch()} />
      </Page>
    );
  }

  return (
    <Page className="max-w-4xl">
      <PageHeader
        title="Inbox"
        description={
          <>
            Capture first, sort later. Press <Kbd>N</Kbd> anywhere to capture.
          </>
        }
      />

      <Panel className="mb-4 p-3">
        <CaptureField />
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
          <Segmented
            aria-label="Show"
            value={filter}
            onValueChange={setFilter}
            options={[
              { value: "open", label: "Open", count: data?.counts.open },
              { value: "pinned", label: "Pinned", count: data?.counts.pinned },
              { value: "done", label: "Done", count: data?.counts.done },
            ]}
          />
          <span className="ml-auto hidden items-center gap-3 text-2xs text-subtle md:flex">
            <span className="flex items-center gap-1">
              <Kbd>E</Kbd> done
            </span>
            <span className="flex items-center gap-1">
              <Kbd>P</Kbd> pin
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd> edit
            </span>
          </span>
        </div>

        {isPending ? (
          <SkeletonRows rows={5} />
        ) : !data?.items.length ? (
          <EmptyState
            icon={Inbox}
            title={filter === "done" ? "Nothing archived yet" : filter === "pinned" ? "Nothing pinned" : "Inbox zero"}
            description={
              filter === "open"
                ? "Thoughts, links and to-dos land here – from this page, the N key, ⌘K, your phone or LUCY."
                : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {data.items.map((note) => (
              <NoteRow key={note.id} note={note} highlighted={note.id === highlightId} />
            ))}
          </ul>
        )}
      </Panel>
    </Page>
  );
}

function NoteRow({ note, highlighted }: { note: NoteItem; highlighted: boolean }) {
  const update = useUpdateNote();
  const remove = useDeleteNote();
  const promote = usePromoteNote();
  const projects = useProjectOptions();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);

  const toggleDone = () => update.mutate({ id: note.id, done: !note.done });
  const togglePin = () => update.mutate({ id: note.id, pinned: !note.pinned });

  const saveEdit = () => {
    setEditing(false);
    const body = draft.trim();
    if (body && body !== note.body) update.mutate({ id: note.id, body });
    else setDraft(note.body);
  };

  // Row shortcuts when the row itself has focus (Tab / click).
  const onKeyDown = (e: KeyboardEvent<HTMLLIElement>) => {
    if (e.target !== e.currentTarget || e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === "e") toggleDone();
    else if (key === "p") togglePin();
    else if (key === "enter") setEditing(true);
    else if (key === "backspace" || key === "delete") remove.mutate(note.id);
    else return;
    e.preventDefault();
  };

  return (
    <li
      id={`note-${note.id}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={cn(
        "group flex gap-3 px-4 py-3 transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:outline-none",
        highlighted && "bg-accent-soft",
      )}
    >
      <button
        type="button"
        onClick={toggleDone}
        aria-label={note.done ? "Reopen" : "Mark as done"}
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full transition-colors",
          note.done
            ? "bg-fg text-inverse"
            : "shadow-[inset_0_0_0_1px_var(--line-strong)] text-transparent hover:text-subtle",
        )}
      >
        <Check className="size-2.5" strokeWidth={3} />
      </button>

      <div className="min-w-0 flex-1">
        {editing ? (
          <textarea
            autoFocus
            value={draft}
            maxLength={NOTE_MAX_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                saveEdit();
              }
              if (e.key === "Escape") {
                setDraft(note.body);
                setEditing(false);
              }
            }}
            rows={Math.min(8, draft.split("\n").length + 1)}
            aria-label="Edit note"
            className={cn(fieldControl, "resize-none py-1.5")}
          />
        ) : (
          <div
            onDoubleClick={() => setEditing(true)}
            className={cn("text-sm", note.done ? "text-subtle line-through decoration-faint" : "text-fg")}
          >
            <LinkifiedText text={note.body} />
          </div>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-2xs text-subtle">
          {note.pinned ? <Pin className="size-3 text-accent" aria-label="Pinned" /> : null}
          <span className="font-mono tabular">{formatRelative(note.createdAt)}</span>
          {note.source !== "app" ? <span>· via {note.source}</span> : null}
          {note.project ? (
            <span className="inline-flex items-center gap-1">
              · <FolderGit2 className="size-3" /> {note.project.name}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-start gap-0.5 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
        {!note.done && note.project ? (
          <Tooltip content={`Make next step of ${note.project.name}`}>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Make next step"
              onClick={() => promote.mutate({ id: note.id })}
            >
              <ArrowRightToLine />
            </Button>
          </Tooltip>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Note actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuItem icon={note.pinned ? <PinOff /> : <Pin />} onSelect={togglePin} shortcut="P">
              {note.pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem icon={note.done ? <RotateCcw /> : <Check />} onSelect={toggleDone} shortcut="E">
              {note.done ? "Reopen" : "Mark as done"}
            </DropdownMenuItem>
            {projects.data?.projects.length ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger icon={<ArrowRightToLine />}>Make next step of</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {projects.data.projects.map((p) => (
                      <DropdownMenuItem key={p.id} onSelect={() => promote.mutate({ id: note.id, projectId: p.id })}>
                        {p.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger icon={<FolderGit2 />}>Assign to project</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {projects.data.projects.map((p) => (
                      <DropdownMenuItem
                        key={p.id}
                        onSelect={() => update.mutate({ id: note.id, projectId: p.id })}
                        shortcut={note.project?.id === p.id ? "●" : undefined}
                      >
                        {p.name}
                      </DropdownMenuItem>
                    ))}
                    {note.project ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => update.mutate({ id: note.id, projectId: null })}>
                          No project
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem icon={<Trash2 />} destructive onSelect={() => remove.mutate(note.id)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
