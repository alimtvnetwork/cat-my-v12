import { describe, expect, it } from "vitest";
import type { EditorRule } from "@/lib/editor/types";
import { pinPatternRule, squareSearchRegion } from "@/lib/vision/pinned-pattern-geometry";

function patternRule(): EditorRule {
  return {
    id: "rule-2",
    name: "Greyscale Pattern Matching",
    kind: "R" as EditorRule["kind"],
    isHidden: false,
    isLocked: false,
    x: 49,
    y: 158,
    width: 930,
    height: 174,
    params: { toolCode: "T102", greyscaleLevel: 151 },
  };
}

describe("pinPatternRule", () => {
  it("squares the ROI and stores the Atmel boxes on the current image", () => {
    const pinned = pinPatternRule(patternRule(), 1046, 360);

    expect(pinned.width).toBe(pinned.height);
    expect(pinned.width).toBe(174);
    expect(pinned.params?.shapeType).toBe("square");
    expect(pinned.params?.authoredFrameWidth).toBe(1046);
    expect(Array.isArray(pinned.params?.referenceBoxes)).toBe(true);
    expect(pinned.params?.referenceBoxes.length).toBe(24);
  });

  it("rebases a stored frame when the next image size differs", () => {
    const first = pinPatternRule(patternRule(), 960, 540);
    const second = pinPatternRule(first, 480, 270);

    expect(second.params?.authoredFrameWidth).toBe(480);
    expect(second.params?.authoredFrameHeight).toBe(270);
    expect(second.width).toBe(second.height);
    expect(second.x).toBe(Math.round(first.x * 0.5));
  });

  it("keeps an already square region square", () => {
    const squared = squareSearchRegion({ x: 10, y: 20, width: 80, height: 40 });

    expect(squared).toEqual({ x: 10, y: 20, width: 40, height: 40 });
  });
});
