import { ChainEventTriggerType } from "@/lib/functions/chain-events";
import { describe, it, expect, vi } from "vitest";
import { createChainEventStoreHandle, type ChainEventStoreFailure } from "../chain-events-store";
import { createMemoryStorage, CHAIN_EVENTS_STORAGE_KEY, type StorageLike } from "../persistence";
import type { ChainEvent } from "../chain-events";

const ev = (over: Partial<ChainEvent> = {}): ChainEvent => ({
  id: "e1",
  trigger: ChainEventTriggerType.BeforeRuleset,
  functionId: "f1",
  enabled: true,
  order: 0,
  ...over,
});

describe("createChainEventStoreHandle", () => {
  it("initial snapshot is empty when storage is empty", () => {
    const s = createChainEventStoreHandle({ storage: createMemoryStorage() });
    expect(s.getSnapshot().events).toEqual([]);
  });

  it("upsert persists, notifies, and round-trips through storage", () => {
    const storage = createMemoryStorage();
    const store = createChainEventStoreHandle({ storage });
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.upsert(ev())).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().events.map((e) => e.id)).toEqual(["e1"]);
    const store2 = createChainEventStoreHandle({ storage });
    expect(store2.getSnapshot().events.map((e) => e.id)).toEqual(["e1"]);
  });

  it("upsert with invalid event surfaces validation failure and does NOT notify", () => {
    const failures: ChainEventStoreFailure[] = [];
    const store = createChainEventStoreHandle({
      storage: createMemoryStorage(),
      onFailure: (f) => failures.push(f),
    });
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.upsert(ev({ id: "" }))).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    expect(failures[0]).toMatchObject({ kind: "validation" });
  });

  it("remove notifies only when an event actually matches", () => {
    const store = createChainEventStoreHandle({ storage: createMemoryStorage() });
    store.upsert(ev());
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.remove("missing")).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    expect(store.remove("e1")).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().events).toEqual([]);
  });

  it("write failure keeps snapshot stable and reports persist failure", () => {
    let allowWrite = true;
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        if (!allowWrite) throw new Error("nope");
      },
      removeItem: () => {},
    };
    const failures: ChainEventStoreFailure[] = [];
    const store = createChainEventStoreHandle({
      storage,
      onFailure: (f) => failures.push(f),
    });
    allowWrite = false;
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.upsert(ev())).toBe(false);
    expect(store.getSnapshot().events).toEqual([]);
    expect(listener).not.toHaveBeenCalled();
    expect(failures[0]).toMatchObject({ kind: "persist" });
  });

  it("construction reports persist failure for unreadable payloads and uses fallback", () => {
    const storage = createMemoryStorage({ [CHAIN_EVENTS_STORAGE_KEY]: "not json" });
    const failures: ChainEventStoreFailure[] = [];
    const store = createChainEventStoreHandle({
      storage,
      onFailure: (f) => failures.push(f),
    });
    expect(store.getSnapshot().events).toEqual([]);
    expect(failures[0]).toMatchObject({
      kind: "persist",
      failure: { code: "persist.parse.failed" },
    });
  });

  it("reload re-reads storage and notifies", () => {
    const storage = createMemoryStorage();
    const store = createChainEventStoreHandle({ storage });
    const listener = vi.fn();
    store.subscribe(listener);
    storage.setItem(CHAIN_EVENTS_STORAGE_KEY, JSON.stringify({ version: 1, events: [ev()] }));
    store.reload();
    expect(store.getSnapshot().events.map((e) => e.id)).toEqual(["e1"]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe stops future notifications", () => {
    const store = createChainEventStoreHandle({ storage: createMemoryStorage() });
    const listener = vi.fn();
    const off = store.subscribe(listener);
    off();
    store.upsert(ev());
    expect(listener).not.toHaveBeenCalled();
  });
});
