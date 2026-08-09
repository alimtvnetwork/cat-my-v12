import { ChainEventTriggerType } from "@/lib/functions/chain-events";
import { describe, it, expect } from "vitest";
import {
  createMemoryStorage,
  loadFunctionLibrary,
  saveFunctionLibrary,
  loadChainEventStore,
  saveChainEventStore,
  FUNCTION_LIBRARY_STORAGE_KEY,
  CHAIN_EVENTS_STORAGE_KEY,
  type StorageLike,
} from "../persistence";
import type { FunctionLibrary } from "../library";
import type { ChainEventStore } from "../chain-events";

const lib: FunctionLibrary = {
  version: 1,
  entries: [
    { id: "f1", name: "f1", description: "", source: "return 1;", createdAt: 1, updatedAt: 1 },
  ],
};

const store: ChainEventStore = {
  version: 1,
  events: [
    {
      id: "e1",
      trigger: ChainEventTriggerType.BeforeRule,
      ruleId: "r1",
      functionId: "f1",
      enabled: true,
      order: 0,
    },
  ],
};

describe("persistence: FunctionLibrary", () => {
  it("empty storage returns EMPTY_LIBRARY with source=empty", () => {
    const r = loadFunctionLibrary(createMemoryStorage());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.source).toBe("empty");
  });

  it("round-trips a valid library", () => {
    const s = createMemoryStorage();
    expect(saveFunctionLibrary(s, lib).ok).toBe(true);
    const r = loadFunctionLibrary(s);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.source).toBe("storage");
      expect(r.value).toEqual(lib);
    }
  });

  it("unreadable JSON returns EMPTY fallback and persist.parse.failed", () => {
    const s = createMemoryStorage({ [FUNCTION_LIBRARY_STORAGE_KEY]: "not json" });
    const r = loadFunctionLibrary(s);
    expect(r.ok).toBe(false);
    if (r.ok === false) {
      expect(r.failure.code).toBe("persist.parse.failed");
      expect(r.fallback.entries).toEqual([]);
    }
  });

  it("validation errors drop invalid entries and surface persist.validation.failed", () => {
    const payload = JSON.stringify({
      version: 1,
      entries: [
        { id: "ok", name: "ok", description: "", source: "return 1;", createdAt: 1, updatedAt: 1 },
        { id: "", name: "", description: "", source: "", createdAt: 0, updatedAt: 0 },
      ],
    });
    const s = createMemoryStorage({ [FUNCTION_LIBRARY_STORAGE_KEY]: payload });
    const r = loadFunctionLibrary(s);
    expect(r.ok).toBe(false);
    if (r.ok === false) {
      expect(r.failure.code).toBe("persist.validation.failed");
      expect(r.fallback.entries.map((e) => e.id)).toEqual(["ok"]);
      expect(r.failure.details).toContain("fn.");
    }
  });

  it("read throw surfaces persist.read.threw", () => {
    const bad: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {},
      removeItem: () => {},
    };
    const r = loadFunctionLibrary(bad);
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.failure.code).toBe("persist.read.threw");
  });

  it("write throw surfaces persist.write.threw and quota errors map to persist.write.quota", () => {
    const throwing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error("nope");
      },
      removeItem: () => {},
    };
    const r1 = saveFunctionLibrary(throwing, lib);
    expect(r1.ok).toBe(false);
    if (r1.ok === false) expect(r1.failure.code).toBe("persist.write.threw");

    const quota: StorageLike = {
      getItem: () => null,
      setItem: () => {
        const e = new Error("QuotaExceededError");
        (e as { name?: string }).name = "QuotaExceededError";

        throw e;
      },
      removeItem: () => {},
    };
    const r2 = saveFunctionLibrary(quota, lib);
    expect(r2.ok).toBe(false);
    if (r2.ok === false) expect(r2.failure.code).toBe("persist.write.quota");
  });
});

describe("persistence: ChainEventStore", () => {
  it("round-trips a valid store under its own key", () => {
    const s = createMemoryStorage();
    expect(saveChainEventStore(s, store).ok).toBe(true);
    const r = loadChainEventStore(s);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual(store);
      expect(r.source).toBe("storage");
    }
  });

  it("uses a distinct key from the function library", () => {
    const s = createMemoryStorage();
    saveChainEventStore(s, store);
    const dumped = (s as ReturnType<typeof createMemoryStorage>).dump();
    expect(Object.keys(dumped)).toEqual([CHAIN_EVENTS_STORAGE_KEY]);
  });

  it("parse failure returns EMPTY fallback with details preserved", () => {
    const s = createMemoryStorage({ [CHAIN_EVENTS_STORAGE_KEY]: "{" });
    const r = loadChainEventStore(s);
    expect(r.ok).toBe(false);
    if (r.ok === false) {
      expect(r.failure.code).toBe("persist.parse.failed");
      expect(r.failure.details).toBeDefined();
    }
  });
});
