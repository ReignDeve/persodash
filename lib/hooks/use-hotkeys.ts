"use client";

import { useEffect, useRef } from "react";

type Bindings = Record<string, (event: KeyboardEvent) => void>;

const SEQUENCE_TIMEOUT_MS = 900;

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(el?.closest("input, textarea, select, [contenteditable=true], [role=dialog]"));
}

/**
 * Minimal keyboard shortcut handler (no dependency needed):
 * - "mod+k"  → Cmd on macOS, Ctrl elsewhere (works while typing)
 * - "g o"    → two-key sequence (ignored while typing or inside dialogs)
 * - "c"      → single key (ignored while typing or inside dialogs)
 */
export function useHotkeys(bindings: Bindings) {
  const ref = useRef(bindings);
  useEffect(() => {
    ref.current = bindings;
  });

  useEffect(() => {
    let prefix: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      const key = event.key.toLowerCase();
      const map = ref.current;

      if ((event.metaKey || event.ctrlKey) && !event.altKey) {
        const handler = map[`mod+${key}`];
        if (handler) {
          event.preventDefault();
          handler(event);
        }
        return;
      }

      if (event.altKey || event.metaKey || event.ctrlKey || isTyping(event.target)) return;

      if (prefix) {
        const handler = map[`${prefix} ${key}`];
        prefix = null;
        clearTimeout(timer);
        if (handler) {
          event.preventDefault();
          handler(event);
          return;
        }
      }

      if (Object.keys(map).some((k) => k.startsWith(`${key} `))) {
        prefix = key;
        timer = setTimeout(() => (prefix = null), SEQUENCE_TIMEOUT_MS);
        return;
      }

      const handler = map[key];
      if (handler) {
        event.preventDefault();
        handler(event);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearTimeout(timer);
    };
  }, []);
}
