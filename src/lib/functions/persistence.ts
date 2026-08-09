// Plan 66 step 20 (FS-01) + step 21 (FS-02) slice 2 groundwork:
// framework-free persistence adapter for the FunctionLibrary and the
// ChainEventStore. Storage is injected so this module is testable without
// touching real localStorage; slice-2 route code will pass
// `window.localStorage`. Every error is surfaced with a coded reason;
// nothing is silently swallowed.

import { EMPTY_LIBRARY, exportLibraryJson, importLibraryJson } from "./library";
import type { FunctionLibrary } from "./library";
import { EMPTY_CHAIN_EVENT_STORE, type ChainEventStore } from "./chain-events";
import { exportChainEventsJson, importChainEventsJson } from "./chain-events-io";
import type { PersistenceErrorCode } from "@/lib/errors/registry";

export const FUNCTION_LIBRARY_STORAGE_KEY = "lovable.functions.library.v1";
export const CHAIN_EVENTS_STORAGE_KEY = "lovable.functions.chain-events.v1";

/** Minimal Storage interface (subset of `window.Storage`). */
export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

/** Kept for source-file locality; the canonical union lives in the registry. */
export type PersistFailureCode = PersistenceErrorCode;

export interface PersistFailure {
  code: PersistFailureCode;
  message: string;
  /** Present for parse.failed and validation.failed. */
  details?: string;
}

export type LoadResult<T> =
  | { ok: true; value: T; source: "storage" | "empty" }
  | { ok: false; fallback: T; failure: PersistFailure };

export type SaveResult = { ok: true } | { ok: false; failure: PersistFailure };

function safeGet(
  storage: StorageLike,
  key: string,
): { ok: true; raw: string | null } | { ok: false; failure: PersistFailure } {
  try {
    return { ok: true, raw: storage.getItem(key) };
  } catch (err) {
    return {
      ok: false,
      failure: {
        code: "persist.read.threw",
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: unknown }).name;

  if (typeof name === "string" && /quota/i.test(name)) return true;
  const message = (err as { message?: unknown }).message;

  return typeof message === "string" && /quota/i.test(message);
}

function safeSet(storage: StorageLike, key: string, value: string): SaveResult {
  try {
    storage.setItem(key, value);

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    return {
      ok: false,
      failure: {
        code: isQuotaError(err) ? "persist.write.quota" : "persist.write.threw",
        message,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// FunctionLibrary
// ---------------------------------------------------------------------------

export function loadFunctionLibrary(storage: StorageLike): LoadResult<FunctionLibrary> {
  const get = safeGet(storage, FUNCTION_LIBRARY_STORAGE_KEY);

  if (get.ok === false) return { ok: false, fallback: { ...EMPTY_LIBRARY }, failure: get.failure };

  if (get.raw === null) {
    return { ok: true, value: { ...EMPTY_LIBRARY }, source: "empty" };
  }

  const parsed = importLibraryJson(get.raw);

  if (parsed.parseError) {
    return {
      ok: false,
      fallback: { ...EMPTY_LIBRARY },
      failure: {
        code: "persist.parse.failed",
        message: "stored function library is unreadable",
        details: parsed.parseError,
      },
    };
  }

  if (parsed.errors.length > 0) {
    return {
      ok: false,
      fallback: parsed.library,
      failure: {
        code: "persist.validation.failed",
        message: `${parsed.errors.length} invalid function entr${parsed.errors.length === 1 ? "y" : "ies"} dropped`,
        details: parsed.errors.map((e) => e.code).join(","),
      },
    };
  }

  return { ok: true, value: parsed.library, source: "storage" };
}

export function saveFunctionLibrary(storage: StorageLike, library: FunctionLibrary): SaveResult {
  return safeSet(storage, FUNCTION_LIBRARY_STORAGE_KEY, exportLibraryJson(library));
}

// ---------------------------------------------------------------------------
// ChainEventStore
// ---------------------------------------------------------------------------

export function loadChainEventStore(storage: StorageLike): LoadResult<ChainEventStore> {
  const get = safeGet(storage, CHAIN_EVENTS_STORAGE_KEY);

  if (get.ok === false)
    return { ok: false, fallback: { ...EMPTY_CHAIN_EVENT_STORE }, failure: get.failure };

  if (get.raw === null) {
    return { ok: true, value: { ...EMPTY_CHAIN_EVENT_STORE }, source: "empty" };
  }

  const parsed = importChainEventsJson(get.raw);

  if (parsed.parseError) {
    return {
      ok: false,
      fallback: { ...EMPTY_CHAIN_EVENT_STORE },
      failure: {
        code: "persist.parse.failed",
        message: "stored chain-event store is unreadable",
        details: parsed.parseError,
      },
    };
  }

  if (parsed.errors.length > 0) {
    return {
      ok: false,
      fallback: parsed.store,
      failure: {
        code: "persist.validation.failed",
        message: `${parsed.errors.length} invalid chain event${parsed.errors.length === 1 ? "" : "s"} dropped`,
        details: parsed.errors.map((e) => e.code).join(","),
      },
    };
  }

  return { ok: true, value: parsed.store, source: "storage" };
}

export function saveChainEventStore(storage: StorageLike, store: ChainEventStore): SaveResult {
  return safeSet(storage, CHAIN_EVENTS_STORAGE_KEY, exportChainEventsJson(store));
}

// ---------------------------------------------------------------------------
// Test double: in-memory storage. Handy for tests and previews.
// ---------------------------------------------------------------------------

export function createMemoryStorage(initial: Record<string, string> = {}): StorageLike & {
  dump: () => Record<string, string>;
} {
  const map = new Map<string, string>(Object.entries(initial));

  return {
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
    dump: () => Object.fromEntries(map),
  };
}
