import { describe, it, expect, vi } from "vitest";
import { createFunctionLibraryStore, type LibraryFailure } from "../library-store";
import {
  createMemoryStorage,
  FUNCTION_LIBRARY_STORAGE_KEY,
  type StorageLike,
} from "../persistence";
import type { FunctionEntry } from "../library";

const entry = (over: Partial<FunctionEntry> = {}): FunctionEntry => ({
  id: "f1",
  name: "f1",
  description: "",
  source: "return 1;",
  createdAt: 1,
  updatedAt: 1,
  ...over,
});

describe("createFunctionLibraryStore", () => {
  it("initial snapshot is empty when storage is empty", () => {
    const s = createFunctionLibraryStore({ storage: createMemoryStorage() });
    expect(s.getSnapshot().entries).toEqual([]);
  });

  it("upsert persists, notifies subscribers, and updates snapshot", () => {
    const storage = createMemoryStorage();
    const store = createFunctionLibraryStore({ storage });
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.upsert(entry())).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().entries.map((e) => e.id)).toEqual(["f1"]);
    // Persisted string is readable back through a fresh store.
    const store2 = createFunctionLibraryStore({ storage });
    expect(store2.getSnapshot().entries.map((e) => e.id)).toEqual(["f1"]);
  });

  it("upsert with invalid entry surfaces validation failure and does NOT notify", () => {
    const failures: LibraryFailure[] = [];
    const store = createFunctionLibraryStore({
      storage: createMemoryStorage(),
      onFailure: (f) => failures.push(f),
    });
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.upsert(entry({ id: "" }))).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    expect(failures[0]).toMatchObject({ kind: "validation" });
  });

  it("remove notifies only when an entry actually matches", () => {
    const store = createFunctionLibraryStore({ storage: createMemoryStorage() });
    store.upsert(entry());
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.remove("does-not-exist")).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    expect(store.remove("f1")).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().entries).toEqual([]);
  });

  it("write failure prevents snapshot from advancing and reports persist failure", () => {
    let allowWrite = true;
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        if (!allowWrite) throw new Error("nope");
      },
      removeItem: () => {},
    };
    const failures: LibraryFailure[] = [];
    const store = createFunctionLibraryStore({
      storage,
      onFailure: (f) => failures.push(f),
    });
    allowWrite = false;
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.upsert(entry())).toBe(false);
    expect(store.getSnapshot().entries).toEqual([]);
    expect(listener).not.toHaveBeenCalled();
    expect(failures[0]).toMatchObject({ kind: "persist" });
  });

  it("construction reports persist failure for unreadable payloads and uses fallback", () => {
    const storage = createMemoryStorage({ [FUNCTION_LIBRARY_STORAGE_KEY]: "not json" });
    const failures: LibraryFailure[] = [];
    const store = createFunctionLibraryStore({
      storage,
      onFailure: (f) => failures.push(f),
    });
    expect(store.getSnapshot().entries).toEqual([]);
    expect(failures[0]).toMatchObject({
      kind: "persist",
      failure: { code: "persist.parse.failed" },
    });
  });

  it("reload re-reads storage and notifies", () => {
    const storage = createMemoryStorage();
    const store = createFunctionLibraryStore({ storage });
    const listener = vi.fn();
    store.subscribe(listener);
    // External write, e.g. another tab.
    storage.setItem(
      FUNCTION_LIBRARY_STORAGE_KEY,
      JSON.stringify({ version: 1, entries: [entry()] }),
    );
    store.reload();
    expect(store.getSnapshot().entries.map((e) => e.id)).toEqual(["f1"]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe stops future notifications", () => {
    const store = createFunctionLibraryStore({ storage: createMemoryStorage() });
    const listener = vi.fn();
    const off = store.subscribe(listener);
    off();
    store.upsert(entry());
    expect(listener).not.toHaveBeenCalled();
  });
});
