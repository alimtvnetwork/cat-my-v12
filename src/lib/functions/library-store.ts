// Plan 66 step 20 (FS-01) slice 2 groundwork: subscribable store for the
// function library. Framework-free (uses the useSyncExternalStore contract
// so the route can bind it with a one-liner), storage injected, failures
// surfaced via a callback. Never swallows errors.

import {
  EMPTY_LIBRARY,
  deleteFunction,
  upsertFunction,
  type FunctionEntry,
  type FunctionLibrary,
  type FunctionValidationError,
} from "./library";
import {
  loadFunctionLibrary,
  saveFunctionLibrary,
  type PersistFailure,
  type StorageLike,
} from "./persistence";

export type LibraryFailure =
  | { kind: "persist"; failure: PersistFailure }
  | { kind: "validation"; errors: FunctionValidationError[] };

export interface FunctionLibraryStore {
  getSnapshot: () => FunctionLibrary;
  subscribe: (listener: () => void) => () => void;
  upsert: (entry: FunctionEntry) => boolean;
  remove: (id: string) => boolean;
  reload: () => void;
}

export interface CreateStoreOptions {
  storage: StorageLike;
  /** Called for every persist or validation failure. Never null. */
  onFailure?: (f: LibraryFailure) => void;
}

/**
 * Build a subscribable store bound to the given storage. Reads once at
 * construction (fallback used on failure and reported via `onFailure`);
 * every mutation writes back and notifies listeners only when the write
 * succeeded.
 */
export function createFunctionLibraryStore(opts: CreateStoreOptions): FunctionLibraryStore {
  const { storage } = opts;
  const onFailure = opts.onFailure ?? (() => {});
  let snapshot: FunctionLibrary = { ...EMPTY_LIBRARY };
  const listeners = new Set<() => void>();

  function notify(): void {
    for (const l of listeners) l();
  }

  function loadInto(): void {
    const r = loadFunctionLibrary(storage);

    if (r.ok) {
      snapshot = r.value;
    } else {
      snapshot = r.fallback;
      onFailure({ kind: "persist", failure: r.failure });
    }
  }

  loadInto();

  function commit(next: FunctionLibrary): boolean {
    const saved = saveFunctionLibrary(storage, next);

    if (saved.ok === false) {
      onFailure({ kind: "persist", failure: saved.failure });

      return false;
    }

    snapshot = next;
    notify();

    return true;
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (l) => {
      listeners.add(l);

      return () => {
        listeners.delete(l);
      };
    },
    upsert: (entry) => {
      const r = upsertFunction(snapshot, entry);

      if (r.errors.length > 0) {
        onFailure({ kind: "validation", errors: r.errors });

        return false;
      }

      return commit(r.library);
    },
    remove: (id) => {
      const next = deleteFunction(snapshot, id);

      if (next.entries.length === snapshot.entries.length) {
        // Nothing matched: not a failure, but not a change either. Skip commit
        // and notification.
        return false;
      }

      return commit(next);
    },
    reload: () => {
      loadInto();
      notify();
    },
  };
}
