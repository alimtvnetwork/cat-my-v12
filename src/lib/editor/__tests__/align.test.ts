import { GuideKindType } from "@/lib/editor/align";
import { describe, expect, it } from "vitest";
import {
  computeAlignment,
  computeGroupMoveAlignment,
  computeGroupResizeAlignment,
  mergeGuides,
} from "../align";

const IMAGE = { x: 0, y: 0, width: 1280, height: 720 };

describe("computeAlignment", () => {
  it("returns the rect unchanged when no siblings are within tolerance", () => {
    const rect = { x: 100, y: 100, width: 50, height: 50 };
    const others = [{ x: 500, y: 500, width: 40, height: 40 }];
    const out = computeAlignment(rect, others, {
      tolerance: 4,
      imageBounds: undefined,
      handle: "se",
    });
    expect(out.rect).toEqual(rect);
    expect(out.guides).toEqual([]);
    expect(out.debug).toBeUndefined();
  });

  it("snaps the west edge to a sibling's left edge and emits a vertical guide", () => {
    const rect = { x: 203, y: 100, width: 100, height: 100 };
    const others = [{ x: 200, y: 400, width: 40, height: 40 }];
    const out = computeAlignment(rect, others, {
      tolerance: 6,
      handle: "w",
    });
    expect(out.rect.x).toBe(200);
    // west drag keeps the east edge fixed => width grew by 3.
    expect(out.rect.width).toBe(103);
    const vs = out.guides.filter((g) => g.orientation === "v");
    expect(vs.length).toBeGreaterThan(0);
    expect(vs.every((g) => g.pos === 200)).toBe(true);
    // Debug telemetry: west edge chose target=200, distance 3px (image).
    expect(out.debug?.x).toEqual({ edge: "l", target: 200, dist: 3, from: 203 });
    expect(out.debug?.y).toBeUndefined();
  });

  it("snaps the south-east handle to the image bounds when close", () => {
    const rect = { x: 100, y: 100, width: 1176, height: 616 };
    const out = computeAlignment(rect, [], {
      tolerance: 6,
      imageBounds: IMAGE,
      handle: "se",
    });
    expect(out.rect.x + out.rect.width).toBe(1280);
    expect(out.rect.y + out.rect.height).toBe(720);
    expect(out.guides.some((g) => g.kind === "bounds" && g.orientation === "v")).toBe(true);
    expect(out.guides.some((g) => g.kind === "bounds" && g.orientation === "h")).toBe(true);
  });

  it("translates the whole rect on a move drag and picks the smallest delta", () => {
    const rect = { x: 102, y: 300, width: 40, height: 40 };
    const others = [
      { x: 100, y: 500, width: 40, height: 40 }, // left edge at x=100
      { x: 200, y: 500, width: 40, height: 40 },
    ];
    const out = computeAlignment(rect, others, {
      tolerance: 5,
      handle: "move",
    });
    expect(out.rect.x).toBe(100);
    expect(out.rect.width).toBe(40);
    expect(out.rect.height).toBe(40);
  });

  it("respects an eligible edge only: north handle never touches x", () => {
    const rect = { x: 197, y: 103, width: 50, height: 50 };
    const others = [{ x: 200, y: 100, width: 40, height: 40 }];
    const out = computeAlignment(rect, others, {
      tolerance: 6,
      handle: "n",
    });
    expect(out.rect.x).toBe(197);
    expect(out.rect.y).toBe(100);
  });
});

describe("mergeGuides", () => {
  it("merges overlapping guides on the same line into a single extended segment", () => {
    const merged = mergeGuides([
      { orientation: "v", pos: 200, from: 100, to: 200, kind: GuideKindType.Edge },
      { orientation: "v", pos: 200, from: 180, to: 400, kind: GuideKindType.Edge },
      { orientation: "h", pos: 50, from: 0, to: 10, kind: GuideKindType.Bounds },
    ]);
    const v = merged.find((g) => g.orientation === "v");
    expect(v).toBeDefined();
    expect(v!.from).toBe(100);
    expect(v!.to).toBe(400);
    expect(merged.filter((g) => g.orientation === "h")).toHaveLength(1);
  });

  it("upgrades kind precedence to center over edge over bounds", () => {
    const merged = mergeGuides([
      { orientation: "v", pos: 300, from: 0, to: 100, kind: GuideKindType.Bounds },
      { orientation: "v", pos: 300, from: 50, to: 200, kind: GuideKindType.Edge },
      { orientation: "v", pos: 300, from: 100, to: 150, kind: GuideKindType.Center },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].kind).toBe("center");
  });
});

describe("computeGroupMoveAlignment", () => {
  it("nudges the whole group so one member's edge lands on a sibling line", () => {
    // Two rects sitting side-by-side, moving down and slightly right.
    // Sibling at x=200 should attract the left rect's right edge.
    const rects = [
      { x: 100, y: 100, width: 40, height: 40 },
      { x: 160, y: 100, width: 40, height: 40 },
    ];
    const siblings = [{ x: 200, y: 500, width: 20, height: 20 }];
    const out = computeGroupMoveAlignment(rects, { dx: 3, dy: 200 }, siblings, { tolerance: 6 });
    // Left rect's right edge starts at 143 (100+40+3) -> should snap to 140? No,
    // sibling left is 200. Second rect's right edge is 203 -> snap to 200 (delta -3).
    expect(out.delta.dx).toBe(0);
    expect(out.delta.dy).toBe(200);
    expect(out.debug?.x?.target).toBe(200);
    expect(out.guides.some((g) => g.orientation === "v" && g.pos === 200)).toBe(true);
  });

  it("preserves relative spacing inside the group", () => {
    const rects = [
      { x: 100, y: 100, width: 40, height: 40 },
      { x: 200, y: 100, width: 40, height: 40 },
    ];
    const out = computeGroupMoveAlignment(rects, { dx: 50, dy: 50 }, [], { tolerance: 5 });
    expect(out.delta).toEqual({ dx: 50, dy: 50 });
    expect(out.guides).toEqual([]);
  });

  it("snaps the group bounding-box centre when no member edge is closer", () => {
    // Group spans x=[100,300], centre=200. Sibling centre at x=210.
    const rects = [
      { x: 100, y: 100, width: 40, height: 40 },
      { x: 260, y: 100, width: 40, height: 40 },
    ];
    // A sibling whose left edge sits at 208 so the group bbox centre
    // (200 -> 208 with dx=8) can snap to it within tolerance.
    const siblings = [{ x: 208, y: 500, width: 40, height: 40 }];
    const out = computeGroupMoveAlignment(rects, { dx: 8, dy: 0 }, siblings, { tolerance: 6 });
    // The best snap picks the closest edge (there are several candidates:
    // member edges and bbox edges). We only assert the group is corrected
    // onto a line at x=208 and that at least one member ended on it.
    expect(out.debug?.x?.target).toBe(208);
    const memberXs = rects.map((r) => r.x + out.delta.dx);
    const memberRights = rects.map((r) => r.x + r.width + out.delta.dx);
    const bboxCentre = (Math.min(...memberXs) + Math.max(...memberRights)) / 2;
    const onLine = [...memberXs, ...memberRights, bboxCentre].some(
      (v) => Math.abs(v - 208) < 0.001,
    );
    expect(onLine).toBe(true);
  });

  it("returns the input delta untouched when no sibling is within tolerance", () => {
    const out = computeGroupMoveAlignment(
      [{ x: 0, y: 0, width: 10, height: 10 }],
      { dx: 100, dy: 100 },
      [{ x: 500, y: 500, width: 5, height: 5 }],
      { tolerance: 4 },
    );
    expect(out.delta).toEqual({ dx: 100, dy: 100 });
    expect(out.guides).toEqual([]);
    expect(out.debug).toBeUndefined();
  });

  it("snaps a group edge to the image bounds when close", () => {
    const out = computeGroupMoveAlignment(
      [
        { x: 100, y: 100, width: 40, height: 40 },
        { x: 200, y: 100, width: 40, height: 40 },
      ],
      { dx: -97, dy: 0 },
      [],
      { tolerance: 6, imageBounds: IMAGE },
    );
    // Leftmost member x = 3 -> should snap to bounds left (0), so dx = -100.
    expect(out.delta.dx).toBe(-100);
    expect(out.debug?.x?.target).toBe(0);
  });
});

describe("computeGroupResizeAlignment", () => {
  it("snaps the active bbox edge onto a sibling line", () => {
    const origin = { x: 100, y: 100, width: 100, height: 100 };
    const proposed = { x: 100, y: 100, width: 103, height: 100 };
    const out = computeGroupResizeAlignment(
      origin,
      proposed,
      [{ x: 200, y: 400, width: 20, height: 20 }],
      { tolerance: 6, handle: "e" },
    );
    expect(out.bbox.x + out.bbox.width).toBe(200);
    expect(out.debug?.x?.target).toBe(200);
  });
});
