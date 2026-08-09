// Plan 78 step 2 (I-SU-05): the store must persist through the injected
// StorageLike, surface persist + validation failures via `onFailure`, and
// never swallow errors. A memory-backed storage stub mirrors localStorage.
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  createCameraLibraryStore,
  findCameraSettingById,
  readCameraLibrarySync,
  upsertCameraSettingSync,
  type StorageLike,
  type CameraFailure,
} from "../store";
import { CAMERA_LIBRARY_STORAGE_KEY, makeDefaultCameraSetting } from "../model";

function memStorage(
  initial: Record<string, string> = {},
): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };

  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

describe("createCameraLibraryStore", () => {
  it("starts empty when storage has no entry", () => {
    const s = createCameraLibraryStore({ storage: memStorage() });
    expect(s.getSnapshot().entries).toEqual([]);
  });

  it("loads existing valid entries and drops invalid ones", () => {
    const good = makeDefaultCameraSetting(1_700_000_000_000);
    const bad = { ...good, id: "bad", name: "" };
    const storage = memStorage({
      [CAMERA_LIBRARY_STORAGE_KEY]: JSON.stringify({ entries: [good, bad] }),
    });
    const s = createCameraLibraryStore({ storage });
    expect(s.getSnapshot().entries.map((e) => e.id)).toEqual([good.id]);
  });

  it("upsert persists valid entry, notifies subscribers, returns true", () => {
    const storage = memStorage();
    const s = createCameraLibraryStore({ storage });
    const listener = vi.fn();
    s.subscribe(listener);
    const ok = s.upsert(makeDefaultCameraSetting(1));
    expect(ok).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(storage.data[CAMERA_LIBRARY_STORAGE_KEY]).toContain('"entries"');
  });

  it("upsert with invalid entry emits validation failure and does not persist", () => {
    const storage = memStorage();
    const failures: CameraFailure[] = [];
    const s = createCameraLibraryStore({ storage, onFailure: (f) => failures.push(f) });
    const invalid = { ...makeDefaultCameraSetting(1), name: "" };
    const ok = s.upsert(invalid);
    expect(ok).toBe(false);
    expect(failures[0]?.kind).toBe("validation");
    expect(storage.data[CAMERA_LIBRARY_STORAGE_KEY]).toBeUndefined();
  });

  it("surfaces persist failure through onFailure and keeps prior snapshot", () => {
    const failures: CameraFailure[] = [];
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {},
    };
    const s = createCameraLibraryStore({ storage, onFailure: (f) => failures.push(f) });
    const ok = s.upsert(makeDefaultCameraSetting(1));
    expect(ok).toBe(false);
    expect(failures[0]?.kind).toBe("persist");
    expect(s.getSnapshot().entries).toEqual([]);
  });

  it("remove deletes and notifies; returns false for missing id", () => {
    const storage = memStorage();
    const s = createCameraLibraryStore({ storage });
    s.upsert(makeDefaultCameraSetting(1));
    const id = s.getSnapshot().entries[0].id;
    const listener = vi.fn();
    s.subscribe(listener);
    expect(s.remove(id)).toBe(true);
    expect(s.remove("missing")).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(s.getSnapshot().entries).toEqual([]);
  });

  it("reload re-reads storage and notifies subscribers", () => {
    const storage = memStorage();
    const s = createCameraLibraryStore({ storage });
    const listener = vi.fn();
    s.subscribe(listener);
    const entry = makeDefaultCameraSetting(1);
    storage.setItem(CAMERA_LIBRARY_STORAGE_KEY, JSON.stringify({ entries: [entry] }));
    s.reload();
    expect(s.getSnapshot().entries).toHaveLength(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("malformed JSON in storage triggers persist failure and starts empty", () => {
    const failures: CameraFailure[] = [];
    const storage = memStorage({ [CAMERA_LIBRARY_STORAGE_KEY]: "{not json" });
    const s = createCameraLibraryStore({ storage, onFailure: (f) => failures.push(f) });
    expect(s.getSnapshot().entries).toEqual([]);
    expect(failures[0]?.kind).toBe("persist");
  });
});

// Plan 78 slice 6: browser-scoped helpers used by bundle export/import.
describe("readCameraLibrarySync / findCameraSettingById / upsertCameraSettingSync", () => {
  const originalWindow = globalThis.window;
  beforeEach(() => {
    const data: Record<string, string> = {};
    // Minimal `window.localStorage` stub sufficient for `browserStorage()`.
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (k: string) => (k in data ? data[k] : null),
          setItem: (k: string, v: string) => {
            data[k] = v;
          },
          removeItem: (k: string) => {
            delete data[k];
          },
        },
      },
    });
  });
  afterEach(() => {
    if (originalWindow === undefined) {
      // @ts-expect-error restore missing window in the node env.
      delete globalThis.window;
    } else {
      Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
    }
  });

  it("readCameraLibrarySync returns empty when nothing persisted", () => {
    expect(readCameraLibrarySync().entries).toEqual([]);
  });

  it("upsertCameraSettingSync persists and findCameraSettingById resolves", () => {
    const entry = makeDefaultCameraSetting(1_700_000_000_000);
    const r = upsertCameraSettingSync(entry);
    expect(r.ok).toBe(true);
    expect(findCameraSettingById(entry.id)?.id).toBe(entry.id);
    expect(findCameraSettingById("missing")).toBeNull();
  });

  it("upsertCameraSettingSync surfaces validation failures without throwing", () => {
    const entry = makeDefaultCameraSetting(1);
    // Force an invalid field: exposure below 1us fails the schema.
    const r = upsertCameraSettingSync({ ...entry, exposureUs: 0 });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.failure.kind).toBe("validation");
  });
});
