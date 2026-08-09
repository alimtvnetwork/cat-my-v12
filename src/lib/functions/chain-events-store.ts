// Plan 66 step 21 (FS-02) slice 2 groundwork: subscribable store for the
// chain-event registry. Framework-free (matches useSyncExternalStore),
// storage injected, failures surfaced via callback. Mirrors library-store.

import {
  EMPTY_CHAIN_EVENT_STORE,
  deleteChainEvent,
  upsertChainEvent,
  type ChainEvent,
  type ChainEventStore,
  type ChainEventValidationError,
} from "./chain-events";
import {
  loadChainEventStore,
  saveChainEventStore,
  type PersistFailure,
  type StorageLike,
} from "./persistence";

export type ChainEventStoreFailure =
  | { kind: "persist"; failure: PersistFailure }
  | { kind: "validation"; errors: ChainEventValidationError[] };

export interface ChainEventStoreHandle {
  getSnapshot: () => ChainEventStore;
  subscribe: (listener: () => void) => () => void;
  upsert: (event: ChainEvent) => boolean;
  remove: (id: string) => boolean;
  reload: () => void;
}

export interface CreateChainEventStoreOptions {
  storage: StorageLike;
  /** Called for every persist or validation failure. Never null. */
  onFailure?: (f: ChainEventStoreFailure) => void;
}

/**
 * Build a subscribable chain-event store bound to the given storage. Reads
 * once at construction (fallback used on failure, reported via `onFailure`);
 * every mutation writes back and notifies listeners only when the write
 * succeeded and something actually changed.
 */
export function createChainEventStoreHandle(
  opts: CreateChainEventStoreOptions,
): ChainEventStoreHandle {
  const { storage } = opts;
  const onFailure = opts.onFailure ?? (() => {});
  let snapshot: ChainEventStore = { ...EMPTY_CHAIN_EVENT_STORE };
  const listeners = new Set<() => void>();

  function notify(): void {
    for (const l of listeners) l();
  }

  function loadInto(): void {
    const r = loadChainEventStore(storage);

    if (r.ok) {
      snapshot = r.value;
    } else {
      snapshot = r.fallback;
      onFailure({ kind: "persist", failure: r.failure });
    }
  }

  loadInto();

  function commit(next: ChainEventStore): boolean {
    const saved = saveChainEventStore(storage, next);

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
    upsert: (event) => {
      const r = upsertChainEvent(snapshot, event);

      if (r.errors.length > 0) {
        onFailure({ kind: "validation", errors: r.errors });

        return false;
      }

      return commit(r.store);
    },
    remove: (id) => {
      const next = deleteChainEvent(snapshot, id);

      if (next.events.length === snapshot.events.length) {
        // Nothing matched: not a failure, not a change. Skip.
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
