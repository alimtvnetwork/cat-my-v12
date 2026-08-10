// Plan 78 step 1 (I-SU-05): subscribable store for the camera library,
// mirrored on `src/lib/functions/library-store.ts`. Storage is injected so the
// route can use `window.localStorage` in the browser and tests can use a
// stub. Never swallows persistence errors.
import {
  CAMERA_LIBRARY_STORAGE_KEY,
  EMPTY_LIBRARY,
  deleteCameraSetting,
  upsertCameraSetting,
  validateCameraSetting,
  type CameraLibrary,
  type CameraSetting,
  type CameraValidationError,
} from "./model";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type CameraFailure =
  | { kind: "persist"; message: string; cause?: unknown }
  | { kind: "validation"; errors: CameraValidationError[] };

export interface CameraLibraryStore {
  getSnapshot: () => CameraLibrary;
  subscribe: (l: () => void) => () => void;
  upsert: (entry: CameraSetting) => boolean;
  remove: (id: string) => boolean;
  reload: () => void;
}

export interface CreateStoreOptions {
  storage: StorageLike;
  onFailure?: (f: CameraFailure) => void;
}

function loadLibrary(storage: StorageLike, onFailure: (f: CameraFailure) => void): CameraLibrary {
  const raw = storage.getItem(CAMERA_LIBRARY_STORAGE_KEY);

  if (raw === null) return { ...EMPTY_LIBRARY };
  try {
    const parsed = JSON.parse(raw) as { entries?: unknown[] };
    const list = Array.isArray(parsed.entries) ? parsed.entries : [];
    const valid: CameraSetting[] = [];
    for (const e of list) {
      const r = validateCameraSetting(e);

      if (r.ok) valid.push(r.value);
    }

    return { entries: valid };
  } catch (err) {
    onFailure({ kind: "persist", message: "Failed to parse camera library", cause: err });

    return { ...EMPTY_LIBRARY };
  }
}

function saveLibrary(
  storage: StorageLike,
  lib: CameraLibrary,
): { ok: true } | { ok: false; isFail: true; failure: CameraFailure } {
  try {
    storage.setItem(CAMERA_LIBRARY_STORAGE_KEY, JSON.stringify(lib));

    return { ok: true };
  } catch (err) {
    return {
      ok: false, isFail: true,
      failure: { kind: "persist", message: "Failed to write camera library", cause: err },
    };
  }
}

export function createCameraLibraryStore(opts: CreateStoreOptions): CameraLibraryStore {
  const { storage } = opts;
  const onFailure = opts.onFailure ?? (() => {});
  let snapshot: CameraLibrary = loadLibrary(storage, onFailure);
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const l of listeners) l();
  };

  function commit(next: CameraLibrary): boolean {
    const r = saveLibrary(storage, next);

    if (r.ok === false) {
      onFailure(r.failure);

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
      const r = upsertCameraSetting(snapshot, entry);

      if (r.errors.length > 0) {
        onFailure({ kind: "validation", errors: r.errors });

        return false;
      }

      return commit(r.library);
    },
    remove: (id) => {
      const next = deleteCameraSetting(snapshot, id);

      if (next.entries.length === snapshot.entries.length) return false;

      return commit(next);
    },
    reload: () => {
      snapshot = loadLibrary(storage, onFailure);
      notify();
    },
  };
}

// Plan 78 slice 6 (I-SU-05 bundle wiring): storage-scoped helpers used by
// bundle export/import. They read/write the same localStorage key the
// per-route stores use, so cross-route reads stay consistent without
// forcing callers to share a single subscribable instance.
function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Snapshot read of the persisted camera library, or empty if unavailable. */
export function readCameraLibrarySync(): CameraLibrary {
  const s = browserStorage();

  if (!s) return { ...EMPTY_LIBRARY };

  return loadLibrary(s, () => {});
}

/** Look up a CameraSetting by id from the persisted library. */
export function findCameraSettingById(id: string): CameraSetting | null {
  return readCameraLibrarySync().entries.find((e) => e.id === id) ?? null;
}

/**
 * Upsert `entry` into the persisted camera library. Returns `ok: false` with
 * validation or persistence errors so callers can surface them; never throws.
 */
export function upsertCameraSettingSync(
  entry: CameraSetting,
): { ok: true } | { ok: false; isFail: true; failure: CameraFailure } {
  const s = browserStorage();

  if (!s) {
    return {
      ok: false, isFail: true,
      failure: { kind: "persist", message: "No browser storage for camera library" },
    };
  }

  const current = loadLibrary(s, () => {});
  const r = upsertCameraSetting(current, entry);

  if (r.errors.length > 0) return { ok: false, isFail: true, failure: { kind: "validation", errors: r.errors } };
  const w = saveLibrary(s, r.library);

  if (w.ok === false) return { ok: false, isFail: true, failure: w.failure };

  return { ok: true };
}
