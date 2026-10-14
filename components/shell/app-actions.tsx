"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { Trip } from "@/lib/schemas/logbook";
import type { ProjectSummary } from "@/lib/schemas/projects";
import type { RoutineItem } from "@/lib/schemas/routines";
import type { MonitorSummary } from "@/lib/schemas/services";
import type { SubscriptionItem } from "@/lib/schemas/subscriptions";

/** Create/edit dialogs that can be opened from anywhere (palette, shortcuts, pages). */
export type Editor =
  | { kind: "project"; item: ProjectSummary | null }
  | { kind: "monitor"; item: MonitorSummary | null; projectId?: string }
  | { kind: "subscription"; item: SubscriptionItem | null; projectId?: string }
  | { kind: "routine"; item: RoutineItem | null; preset?: Partial<RoutineItem> };

/**
 * App-wide actions reachable from anywhere (command palette, shortcuts,
 * mobile quick-add). The dialogs themselves are mounted once in the shell.
 * All callbacks are referentially stable.
 */
type AppActions = {
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  tripDialog: { open: boolean; trip: Trip | null };
  openTripDialog: (trip?: Trip) => void;
  closeTripDialog: () => void;
  walletDialogOpen: boolean;
  setWalletDialogOpen: (open: boolean) => void;
  editor: Editor | null;
  openEditor: (editor: Editor) => void;
  closeEditor: () => void;
  capture: { open: boolean; text: string };
  openCapture: (text?: string) => void;
  closeCapture: () => void;
};

const AppActionsContext = createContext<AppActions | null>(null);

export function AppActionsProvider({ children }: { children: ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [tripDialog, setTripDialog] = useState<AppActions["tripDialog"]>({ open: false, trip: null });
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [capture, setCapture] = useState<AppActions["capture"]>({ open: false, text: "" });

  const openTripDialog = useCallback((trip?: Trip) => setTripDialog({ open: true, trip: trip ?? null }), []);
  const closeTripDialog = useCallback(() => setTripDialog((s) => ({ ...s, open: false })), []);
  const openEditor = useCallback((e: Editor) => setEditor(e), []);
  const closeEditor = useCallback(() => setEditor(null), []);
  const openCapture = useCallback((text?: string) => setCapture({ open: true, text: text ?? "" }), []);
  const closeCapture = useCallback(() => setCapture((c) => ({ ...c, open: false })), []);

  const value = useMemo<AppActions>(
    () => ({
      commandOpen,
      setCommandOpen,
      tripDialog,
      openTripDialog,
      closeTripDialog,
      walletDialogOpen,
      setWalletDialogOpen,
      editor,
      openEditor,
      closeEditor,
      capture,
      openCapture,
      closeCapture,
    }),
    [
      commandOpen,
      tripDialog,
      walletDialogOpen,
      editor,
      capture,
      openTripDialog,
      closeTripDialog,
      openEditor,
      closeEditor,
      openCapture,
      closeCapture,
    ],
  );

  return <AppActionsContext.Provider value={value}>{children}</AppActionsContext.Provider>;
}

export function useAppActions() {
  const ctx = useContext(AppActionsContext);
  if (!ctx) throw new Error("useAppActions must be used inside <AppActionsProvider>");
  return ctx;
}
