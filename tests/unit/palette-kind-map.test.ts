import { describe, expect, it } from "vitest";
import { isPaletteApplicable, fallbackPaletteFor } from "@/lib/editor/selection/palette-kind-map";

describe("palette-kind-map", () => {
  it("treats null shared kind as fully applicable (no or mixed selection)", () => {
    for (const id of [
      "info",
      "history",
      "adjust",
      "grid",
      "brush",
      "layers",
      "type",
      "paragraph",
      "css",
      "image",
    ] as const) {
      expect(isPaletteApplicable(id, null)).toBe(true);
    }
  });

  it("allows grid pane for C/R/K but not S/E", () => {
    expect(isPaletteApplicable("grid", "C")).toBe(true);
    expect(isPaletteApplicable("grid", "R")).toBe(true);
    expect(isPaletteApplicable("grid", "K")).toBe(true);
    expect(isPaletteApplicable("grid", "S")).toBe(false);
    expect(isPaletteApplicable("grid", "E")).toBe(false);
  });

  it("blocks freehand/text-only panes for every current kind", () => {
    for (const k of ["C", "R", "K", "S", "E"] as const) {
      expect(isPaletteApplicable("brush", k)).toBe(false);
      expect(isPaletteApplicable("type", k)).toBe(false);
      expect(isPaletteApplicable("paragraph", k)).toBe(false);
    }
  });

  it("keeps info/history/adjust/layers/css/image applicable to every kind", () => {
    for (const k of ["C", "R", "K", "S", "E"] as const) {
      for (const id of ["info", "history", "adjust", "layers", "css", "image"] as const) {
        expect(isPaletteApplicable(id, k)).toBe(true);
      }
    }
  });

  it("fallback always returns info (guaranteed applicable)", () => {
    expect(fallbackPaletteFor(null)).toBe("info");
    expect(fallbackPaletteFor("R")).toBe("info");
    expect(fallbackPaletteFor("S")).toBe("info");
  });
});
