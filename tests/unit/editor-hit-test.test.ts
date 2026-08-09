import { describe, expect, it } from "vitest";
import { hitTest, pointInRect } from "@/lib/editor/hit-test";
import type { EditorRule } from "@/lib/editor/types";

const rule = (over: Partial<EditorRule>): EditorRule => ({
  id: "r",
  name: "r",
  kind: "R",
  isHidden: false,
  isLocked: false,
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  ...over,
});

describe("hitTest", () => {
  it("returns null on empty list", () => {
    expect(hitTest({ x: 0, y: 0 }, [])).toBeNull();
  });

  it("returns the topmost rule (last in list wins)", () => {
    const a = rule({ id: "a", x: 0, y: 0, width: 20, height: 20 });
    const b = rule({ id: "b", x: 5, y: 5, width: 5, height: 5 });
    expect(hitTest({ x: 7, y: 7 }, [a, b])).toBe("b");
  });

  it("skips hidden rules but keeps locked rules selectable", () => {
    const hidden = rule({ id: "h", isHidden: true });
    const locked = rule({ id: "l", isLocked: true });
    const ok = rule({ id: "ok" });
    expect(hitTest({ x: 5, y: 5 }, [hidden])).toBeNull();
    expect(hitTest({ x: 5, y: 5 }, [hidden, locked])).toBe("l");
    expect(hitTest({ x: 5, y: 5 }, [hidden, locked, ok])).toBe("ok");
  });

  it("includes a small hit-padding around the rule", () => {
    const r = rule({ id: "r", x: 10, y: 10, width: 4, height: 4 });
    // Just outside geometry but within the 3px pad.
    expect(hitTest({ x: 8, y: 12 }, [r])).toBe("r");
    // Far outside pad.
    expect(hitTest({ x: 0, y: 0 }, [r])).toBeNull();
  });

  it("ignores zero-area rules", () => {
    const zero = rule({ id: "z", width: 0, height: 0 });
    expect(hitTest({ x: 0, y: 0 }, [zero])).toBeNull();
  });

  it("pointInRect is inclusive at edges", () => {
    expect(pointInRect({ x: 10, y: 10 }, { x: 0, y: 0, width: 10, height: 10 })).toBe(true);
    expect(pointInRect({ x: 11, y: 10 }, { x: 0, y: 0, width: 10, height: 10 })).toBe(false);
  });
});
