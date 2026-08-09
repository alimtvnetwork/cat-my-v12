import { describe, expect, it } from "vitest";
import { snapRect, snapScalar } from "@/lib/editor/snap";

describe("snap-to-grid", () => {
  it("returns the input unchanged when disabled", () => {
    expect(snapScalar(37.4, { enabled: false, gridPx: 10 })).toBe(37.4);
    expect(
      snapRect({ x: 1.1, y: 2.2, width: 3.3, height: 4.4 }, { enabled: false, gridPx: 10 }),
    ).toEqual({
      x: 1.1,
      y: 2.2,
      width: 3.3,
      height: 4.4,
    });
  });

  it("rounds to the nearest grid multiple when enabled", () => {
    const cfg = { enabled: true, gridPx: 10 };
    expect(snapScalar(37.4, cfg)).toBe(40);
    expect(snapScalar(-3, cfg)).toBe(-0);
    expect(snapScalar(25, cfg)).toBe(30); // .5 rounds up
  });

  it("guards against zero / negative grid", () => {
    expect(snapScalar(17, { enabled: true, gridPx: 0 })).toBe(17);
    expect(snapScalar(17, { enabled: true, gridPx: -5 })).toBe(17);
  });

  it("snaps every scalar of a rect independently", () => {
    const cfg = { enabled: true, gridPx: 8 };
    expect(snapRect({ x: 3, y: 5, width: 17, height: 21 }, cfg)).toEqual({
      x: 0,
      y: 8,
      width: 16,
      height: 24,
    });
  });
});
