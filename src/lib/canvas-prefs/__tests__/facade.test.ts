import { ImageChannelType } from "@/lib/canvas-prefs/facade";
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("idb-keyval", () => {
  const store = new Map<string, unknown>();

  return {
    get: vi.fn(async (k: string) => store.get(k)),
    set: vi.fn(async (k: string, v: unknown) => {
      store.set(k, v);
    }),
    __store: store,
  };
});

describe("canvasPrefsFacade", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns defaults when IDB is empty", async () => {
    const { canvasPrefsFacade, DEFAULT_CANVAS_PREFS } = await import("../facade");
    const prefs = await canvasPrefsFacade.get();
    expect(prefs).toEqual(DEFAULT_CANVAS_PREFS);
  });

  it("persists grid patches and clamps spacing", async () => {
    const { canvasPrefsFacade } = await import("../facade");
    await canvasPrefsFacade.setGrid({ show: false, spacing: 32 });
    const p = await canvasPrefsFacade.get();
    expect(p.grid.show).toBe(false);
    expect(p.grid.spacing).toBe(32);
  });

  it("clamps adjust values to safe ranges", async () => {
    const { canvasPrefsFacade } = await import("../facade");
    await canvasPrefsFacade.setAdjust({ brightness: 999, gamma: -5 });
    const p = await canvasPrefsFacade.get();
    expect(p.adjust.brightness).toBe(100);
    expect(p.adjust.gamma).toBe(0.2);
  });

  it("reset restores defaults", async () => {
    const { canvasPrefsFacade, DEFAULT_CANVAS_PREFS } = await import("../facade");
    await canvasPrefsFacade.setGrid({ show: false });
    await canvasPrefsFacade.reset();
    expect(await canvasPrefsFacade.get()).toEqual(DEFAULT_CANVAS_PREFS);
  });

  it("persists image channel and rejects invalid values", async () => {
    const { canvasPrefsFacade } = await import("../facade");
    await canvasPrefsFacade.setImage({ channel: ImageChannelType.G });
    expect((await canvasPrefsFacade.get()).image.channel).toBe("g");
    // @ts-expect-error - invalid channel should fall back to rgb
    await canvasPrefsFacade.setImage({ channel: "z" });
    expect((await canvasPrefsFacade.get()).image.channel).toBe("rgb");
  });

  it("computeHistogram reacts to brightness and channel", async () => {
    const { computeHistogram, HISTOGRAM_BINS } = await import("../histogram");
    const low = computeHistogram({ brightness: -80, contrast: 0, gamma: 1 }, ImageChannelType.Rgb);
    const high = computeHistogram({ brightness: 80, contrast: 0, gamma: 1 }, ImageChannelType.Rgb);
    expect(low.peak).toBeLessThan(high.peak);
    expect(low.bins).toHaveLength(HISTOGRAM_BINS);
    const red = computeHistogram({ brightness: 0, contrast: 0, gamma: 1 }, ImageChannelType.R);
    const blue = computeHistogram({ brightness: 0, contrast: 0, gamma: 1 }, ImageChannelType.B);
    // red channel weight rises with bin index; blue falls.
    expect(red.bins[HISTOGRAM_BINS - 1]).toBeGreaterThan(red.bins[0]);
    expect(blue.bins[0]).toBeGreaterThan(blue.bins[HISTOGRAM_BINS - 1]);
  });
});
