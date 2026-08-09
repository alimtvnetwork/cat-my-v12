import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("idb-keyval", () => {
  const store = new Map<string, unknown>();

  return {
    get: vi.fn(async (k: string) => store.get(k)),
    set: vi.fn(async (k: string, v: unknown) => {
      store.set(k, v);
    }),
  };
});

describe("typeToolFacade", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns defaults when IDB is empty", async () => {
    const { typeToolFacade, DEFAULT_TYPE_PREFS } = await import("../facade");
    expect(await typeToolFacade.get()).toEqual(DEFAULT_TYPE_PREFS);
  });

  it("persists partial patches and clamps size", async () => {
    const { typeToolFacade } = await import("../facade");
    await typeToolFacade.set({ family: "JetBrains Mono", size: 999 });
    const p = await typeToolFacade.get();
    expect(p.family).toBe("JetBrains Mono");
    expect(p.size).toBe(96);
  });

  it("rejects invalid weight/align/lineHeight", async () => {
    const { typeToolFacade } = await import("../facade");
    await typeToolFacade.set({
      weight: "999" as never,
      align: "diagonal" as never,
      lineHeight: -1,
    });
    const p = await typeToolFacade.get();
    expect(p.weight).toBe("500");
    expect(p.align).toBe("left");
    expect(p.lineHeight).toBe(1);
  });
});
