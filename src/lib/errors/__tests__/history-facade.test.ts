// Plan 71 Step 15: unit coverage for the error-history persistence facade.
// Uses the in-memory `MemoryProjectRepositoryFacade` behind the same public
// API so we exercise the JSON contract without touching real IndexedDB.

import { describe, it, expect, beforeEach } from "vitest";

import {
  __setProjectRepositoryFacadeForTests,
  makeProjectRepositoryFacade,
} from "@/lib/projects/facade";
import {
  loadErrorHistory,
  saveErrorHistory,
  clearPersistedErrorHistory,
  __ERROR_HISTORY_STORAGE_KEY,
  __ERROR_HISTORY_MAX,
} from "@/lib/errors/history-facade";
import { buildCapturedError } from "@/types/errors";

// Build a minimal in-memory facade for the test.
function memoryFacade() {
  const store = new Map<string, string>();

  return {
    kind: "memory" as const,
    async readItem(key: string) {
      return store.get(key) ?? null;
    },
    async writeItem(key: string, value: string) {
      store.set(key, value);
    },
    async removeItem(key: string) {
      store.delete(key);
    },
  };
}

describe("errors/history-facade", () => {
  beforeEach(() => {
    __setProjectRepositoryFacadeForTests(memoryFacade());
  });

  it("returns [] when nothing is stored", async () => {
    expect(await loadErrorHistory()).toEqual([]);
  });

  it("round-trips a captured error through save/load", async () => {
    const c = buildCapturedError(new Error("boom"), { triggerComponent: "test" });
    await saveErrorHistory([c]);
    const back = await loadErrorHistory();
    expect(back).toHaveLength(1);
    expect(back[0].id).toBe(c.id);
    expect(back[0].message).toBe("boom");
  });

  it("trims to MAX_HISTORY on save", async () => {
    const many = Array.from({ length: __ERROR_HISTORY_MAX + 20 }, (_, i) =>
      buildCapturedError(new Error(`e${i}`)),
    );
    await saveErrorHistory(many);
    const back = await loadErrorHistory();
    expect(back).toHaveLength(__ERROR_HISTORY_MAX);
  });

  it("drops entries missing an id (defensive parse)", async () => {
    const f = makeProjectRepositoryFacade();
    await f.writeItem(
      __ERROR_HISTORY_STORAGE_KEY,
      JSON.stringify([{ id: "keep", message: "ok" }, { message: "no-id" }, null, 42]),
    );
    const back = await loadErrorHistory();
    expect(back).toHaveLength(1);
    expect(back[0].id).toBe("keep");
  });

  it("clear removes the persisted key", async () => {
    await saveErrorHistory([buildCapturedError(new Error("x"))]);
    await clearPersistedErrorHistory();
    expect(await loadErrorHistory()).toEqual([]);
  });
});
