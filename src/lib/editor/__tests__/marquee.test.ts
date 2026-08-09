import { EditorRuleKindType } from "@/lib/editor/types";
import { describe, expect, it } from "vitest";
import type { EditorRule } from "@/lib/editor/types";
import {
  isMarqueeEngaged,
  marqueeFromPoints,
  rectsIntersect,
  ruleIdsInMarquee,
} from "@/lib/editor/marquee";

const mk = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  extra: Partial<EditorRule> = {},
): EditorRule => ({
  id,
  name: id,
  kind: EditorRuleKindType.R,
  isHidden: false,
  isLocked: false,
  x,
  y,
  width: w,
  height: h,
  ...extra,
});

describe("marquee geometry", () => {
  it("normalises rect from any drag direction", () => {
    expect(marqueeFromPoints({ x: 10, y: 10 }, { x: 30, y: 40 })).toEqual({
      x: 10,
      y: 10,
      width: 20,
      height: 30,
    });
    expect(marqueeFromPoints({ x: 30, y: 40 }, { x: 10, y: 10 })).toEqual({
      x: 10,
      y: 10,
      width: 20,
      height: 30,
    });
  });

  it("treats sub-threshold rects as unengaged (bare click)", () => {
    expect(isMarqueeEngaged({ x: 0, y: 0, width: 2, height: 2 })).toBe(false);
    expect(isMarqueeEngaged({ x: 0, y: 0, width: 5, height: 0 })).toBe(true);
  });

  it("intersects on any overlap, misses on disjoint", () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    expect(rectsIntersect(a, { x: 5, y: 5, width: 10, height: 10 })).toBe(true);
    expect(rectsIntersect(a, { x: 20, y: 20, width: 5, height: 5 })).toBe(false);
    // Edge-only contact is not an intersection (strict inequality).
    expect(rectsIntersect(a, { x: 10, y: 0, width: 5, height: 10 })).toBe(false);
  });

  it("selects intersecting rules and skips hidden/locked", () => {
    const rules: EditorRule[] = [
      mk("a", 0, 0, 10, 10),
      mk("b", 50, 50, 10, 10),
      mk("c", 5, 5, 10, 10, { isHidden: true }),
      mk("d", 5, 5, 10, 10, { isLocked: true }),
    ];
    const ids = ruleIdsInMarquee({ x: 0, y: 0, width: 20, height: 20 }, rules);
    expect(ids).toEqual(["a"]);
  });
});
