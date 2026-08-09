import { ChannelIdType } from "@/lib/palette/facade";
import { describe, expect, it, beforeEach } from "vitest";
import { makePaletteFacade, __setPaletteFacadeForTests, DEFAULT_CHANNELS } from "../facade";

// idb-keyval falls back to in-memory when IDB is unavailable (vitest jsdom).
// Each test resets the cached facade to force a fresh hydrate.

describe("palette facade", () => {
  beforeEach(() => {
    __setPaletteFacadeForTests(null);
  });

  it("returns default channels for a fresh rule", () => {
    const f = makePaletteFacade();
    const s = f.get("rule-1");
    expect(s.channels.map((c) => c.id)).toEqual(DEFAULT_CHANNELS.map((c) => c.id));
    expect(s.paths).toEqual([]);
  });

  it("toggles channel visibility and persists", async () => {
    const f = makePaletteFacade();
    await f.toggleChannel("rule-1", ChannelIdType.R);
    const s = f.get("rule-1");
    expect(s.channels.find((c) => c.id === "r")?.visible).toBe(false);

    __setPaletteFacadeForTests(null);
    const f2 = makePaletteFacade();
    // Force hydrate then read.
    await f2.__hydrate();
    const s2 = f2.get("rule-1");
    expect(s2.channels.find((c) => c.id === "r")?.visible).toBe(false);
  });

  it("reorders channels via move", async () => {
    const f = makePaletteFacade();
    await f.reorderChannel("rule-2", ChannelIdType.Rgb, 1);
    const s = f.get("rule-2");
    const ids = s.channels
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((c) => c.id);
    expect(ids[0]).toBe("r");
    expect(ids[1]).toBe("rgb");
  });

  it("adds, reorders, and removes paths", async () => {
    const f = makePaletteFacade();
    await f.addPath("rule-3", { id: "p1", name: "A", d: "M 0 0", visible: true });
    await f.addPath("rule-3", { id: "p2", name: "B", d: "M 1 1", visible: true });
    let s = f.get("rule-3");
    expect(s.paths.map((p) => p.id)).toEqual(["p1", "p2"]);
    await f.reorderPath("rule-3", "p2", -1);
    s = f.get("rule-3");
    const sorted = s.paths
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((p) => p.id);
    expect(sorted).toEqual(["p2", "p1"]);
    await f.removePath("rule-3", "p2");
    s = f.get("rule-3");
    expect(s.paths.map((p) => p.id)).toEqual(["p1"]);
    expect(s.paths[0].order).toBe(0);
  });
});
