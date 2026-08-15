// Plan 79 step 31. Session-scoped edit-history log for the rule editor.
//
// Root cause the store fixes, in one sentence: the Properties palette
// History tab has no data source, so it can only render placeholder
// copy; a lightweight subscribable ring buffer gives it real content
// without waiting on the full command-stack refactor.
//
// Contract:
//   - `push(entry)` appends a HistoryEntry; buffer capped at 100.
//   - `undo()` / `redo()` move an index cursor (no state mutation yet;
//     the actual editor mutations land with step 37+).
//   - `subscribe(cb)` / `getSnapshot()` back `useSyncExternalStore`.
//   - `clear()` resets buffer and cursor (used by tests and route change).
//
// Failure modes are logged through the editor logger so History-tab
// bugs surface in the log stream instead of failing silently.

import { useSyncExternalStore } from "react";
import { logger } from "@/lib/editor/errors";

export interface HistoryEntry {
  /** Stable id for React keys. */
  id: string;
  /** Short verb label, e.g. "Add ROI", "Move ROI". */
  label: string;
  /** Optional target identifier for humans (ROI name, tool id). */
  target?: string;
  /** ms epoch when the entry was recorded. */
  ts: number;
}

interface Snapshot {
  readonly entries: readonly HistoryEntry[];
  /** Index of the "current" entry; entries after it are redoable. */
  readonly cursor: number;
}

const CAP = 100;
let snapshot: Snapshot = { entries: [], cursor: -1 };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) {
    try {
      l();
    } catch (err) {
      logger.warn("W_UI_HISTORY_LISTENER_THREW", {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

function nextId(): string {
  return `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const historyStore = {
  push(label: string, target?: string): HistoryEntry {
    const entry: HistoryEntry = { id: nextId(), label, target, ts: Date.now() };
    // Drop any redoable tail when a new action is recorded.
    const kept = snapshot.entries.slice(0, snapshot.cursor + 1);
    const nextEntries = [...kept, entry].slice(-CAP);
    snapshot = { entries: nextEntries, cursor: nextEntries.length - 1 };
    logger.info("I_UI_HISTORY_PUSH", { label, target: target ?? "" });
    emit();

    return entry;
  },
  undo(): boolean {
    if (snapshot.cursor < 0) return false;
    snapshot = { entries: snapshot.entries, cursor: snapshot.cursor - 1 };
    logger.info("I_UI_HISTORY_UNDO", { cursor: snapshot.cursor });
    emit();

    return true;
  },
  redo(): boolean {
    if (snapshot.cursor >= snapshot.entries.length - 1) return false;
    snapshot = { entries: snapshot.entries, cursor: snapshot.cursor + 1 };
    logger.info("I_UI_HISTORY_REDO", { cursor: snapshot.cursor });
    emit();

    return true;
  },
  jumpTo(cursor: number): void {
    const clamped = Math.max(-1, Math.min(snapshot.entries.length - 1, cursor));

    if (clamped === snapshot.cursor) return;
    snapshot = { entries: snapshot.entries, cursor: clamped };
    logger.info("I_UI_HISTORY_JUMP", { cursor: clamped });
    emit();
  },
  clear(): void {
    snapshot = { entries: [], cursor: -1 };
    emit();
  },
  getSnapshot(): Snapshot {
    return snapshot;
  },
  subscribe(cb: () => void): () => void {
    listeners.add(cb);

    return () => {
      listeners.delete(cb);
    };
  },
};

export function useHistory(): Snapshot {
  return useSyncExternalStore(
    historyStore.subscribe,
    historyStore.getSnapshot,
    historyStore.getSnapshot,
  );
}
