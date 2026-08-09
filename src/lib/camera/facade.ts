// Plan 79 step 15. CameraSetting facade wrap.
//
// Contract: .lovable/pending-facades/04-camera-setting-facade-wrap.md
// Wraps the existing localStorage-backed helpers in src/lib/camera/store.ts
// (Plan 78) so V4 code can talk to a uniform facade surface without moving
// the underlying persistence (bundle round-trips + Playwright fixtures keep
// working). Storage is NOT migrated to the ProjectRepositoryFacade here.
//
// Referrer guard against project bindings is resolved lazily via a callback
// (same shape as MicSettingsFacade) so this module has zero dep on projects.

import {
  readCameraLibrarySync,
  findCameraSettingById,
  upsertCameraSettingSync,
  createCameraLibraryStore,
  type CameraFailure,
  type CameraLibraryStore,
} from "./store";
import {
  validateCameraSetting,
  deleteCameraSetting,
  CAMERA_LIBRARY_STORAGE_KEY,
  type CameraSetting,
  type CameraValidationError,
} from "./model";

function newCorrelationId(): string {
  return Math.random().toString(36).slice(2, 10).padEnd(8, "0");
}

export type CameraReferrerResolver = (id: string) => string[];

export type CameraSaveOutcome =
  | { ok: true; entry: CameraSetting }
  | { ok: false; kind: "validation"; errors: CameraValidationError[]; correlationId: string }
  | { ok: false; kind: "persist"; message: string; correlationId: string };

export type CameraRemoveOutcome =
  | { ok: true }
  | { ok: false; kind: "referenced"; projects: string[]; correlationId: string }
  | { ok: false; kind: "persist"; message: string; correlationId: string };

export interface CameraFacade {
  list(): CameraSetting[];
  get(id: string): CameraSetting | null;
  save(entry: CameraSetting): CameraSaveOutcome;
  remove(id: string): CameraRemoveOutcome;
  subscribe(listener: () => void): () => void;
  setReferrerResolver(fn: CameraReferrerResolver | null): void;
}

interface WindowStorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

function browserStorage(): WindowStorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

class LocalStorageCameraFacade implements CameraFacade {
  private store: CameraLibraryStore | null = null;
  private listeners = new Set<() => void>();
  private resolveReferrers: CameraReferrerResolver = () => [];

  private ensureStore(): CameraLibraryStore | null {
    if (this.store) return this.store;
    const s = browserStorage();

    if (!s) return null;
    this.store = createCameraLibraryStore({
      storage: s,
      onFailure: (f: CameraFailure) => {
        console.warn("[camera/facade] persistence failure", f);
      },
    });
    // Fan out store updates to facade subscribers.
    this.store.subscribe(() => {
      for (const l of this.listeners) l();
    });

    return this.store;
  }

  list(): CameraSetting[] {
    const st = this.ensureStore();

    return st ? st.getSnapshot().entries : readCameraLibrarySync().entries;
  }

  get(id: string): CameraSetting | null {
    return findCameraSettingById(id);
  }

  save(entry: CameraSetting): CameraSaveOutcome {
    const validated = validateCameraSetting(entry);

    if (validated.ok === false) {
      return {
        ok: false,
        kind: "validation",
        errors: validated.errors,
        correlationId: newCorrelationId(),
      };
    }

    const st = this.ensureStore();

    if (st) {
      const ok = st.upsert(entry);

      if (!ok) {
        return {
          ok: false,
          kind: "persist",
          message: "camera store rejected upsert",
          correlationId: newCorrelationId(),
        };
      }

      return { ok: true, entry };
    }
    // No browser (SSR / tests without stub): fall back to sync helper.
    const r = upsertCameraSettingSync(entry);

    if (r.ok === false) {
      const f = r.failure;

      if (f.kind === "validation") {
        return {
          ok: false,
          kind: "validation",
          errors: f.errors,
          correlationId: newCorrelationId(),
        };
      }

      return {
        ok: false,
        kind: "persist",
        message: f.message,
        correlationId: newCorrelationId(),
      };
    }

    for (const l of this.listeners) l();

    return { ok: true, entry };
  }

  remove(id: string): CameraRemoveOutcome {
    const referrers = this.resolveReferrers(id);

    if (referrers.length > 0) {
      return {
        ok: false,
        kind: "referenced",
        projects: referrers,
        correlationId: newCorrelationId(),
      };
    }

    const st = this.ensureStore();

    if (st) {
      const removed = st.remove(id);

      if (!removed) {
        return {
          ok: false,
          kind: "persist",
          message: `camera id not found: ${id}`,
          correlationId: newCorrelationId(),
        };
      }

      return { ok: true };
    }
    // Fallback path: mutate library directly via localStorage.
    const s = browserStorage();

    if (!s) {
      return {
        ok: false,
        kind: "persist",
        message: "no browser storage",
        correlationId: newCorrelationId(),
      };
    }

    const raw = s.getItem(CAMERA_LIBRARY_STORAGE_KEY);

    if (!raw) return { ok: true };
    try {
      const lib = JSON.parse(raw);
      const next = deleteCameraSetting(lib, id);
      s.setItem(CAMERA_LIBRARY_STORAGE_KEY, JSON.stringify(next));
      for (const l of this.listeners) l();

      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        kind: "persist",
        message: String(err),
        correlationId: newCorrelationId(),
      };
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    // Ensure the underlying store is wired so it fans updates in.
    this.ensureStore();

    return () => {
      this.listeners.delete(listener);
    };
  }

  setReferrerResolver(fn: CameraReferrerResolver | null): void {
    this.resolveReferrers = fn ?? (() => []);
  }
}

let cached: CameraFacade | null = null;

export function makeCameraFacade(): CameraFacade {
  if (cached) return cached;
  cached = new LocalStorageCameraFacade();

  return cached;
}

export function __setCameraFacadeForTests(f: CameraFacade | null): void {
  cached = f;
}
