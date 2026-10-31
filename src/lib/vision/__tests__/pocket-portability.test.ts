import { describe, expect, it } from "vitest";
import {
  absoluteToPocketOffset,
  absoluteToPocketRelative,
  adaptBoxToPocket,
  adaptPointToPocket,
  pocketOffsetToAbsolute,
  pocketRelativeToAbsolute,
} from "../carrier-tape-segmenter";
import {
  absoluteToPocketRelative as patternAbsoluteToPocketRelative,
  adaptBoxToPocket as patternAdaptBoxToPocket,
  adaptPointToPocket as patternAdaptPointToPocket,
} from "../pattern-matcher";

const source = { x: 100, y: 200, width: 200, height: 100 };
const target = { x: 400, y: 100, width: 100, height: 200 };

describe("pocket portability helpers (carrier-tape-segmenter)", () => {
  it("converts absolute <-> pocket-relative and round-trips", () => {
    const relative = absoluteToPocketRelative({ x: 150, y: 225 }, source);
    expect(relative.u).toBeCloseTo(0.25);
    expect(relative.v).toBeCloseTo(0.25);
    expect(pocketRelativeToAbsolute(relative, source)).toEqual({ x: 150, y: 225 });
  });

  it("converts absolute <-> pixel offset and round-trips", () => {
    expect(absoluteToPocketOffset({ x: 150, y: 225 }, source)).toEqual({ x: 50, y: 25 });
    expect(pocketOffsetToAbsolute({ x: 50, y: 25 }, source)).toEqual({ x: 150, y: 225 });
  });

  it("adapts a point by translate+scale to a different-sized pocket", () => {
    // (150,225) is at (0.25, 0.25) of source -> (425, 150) of target.
    expect(adaptPointToPocket({ x: 150, y: 225 }, source, target)).toEqual({
      x: 425,
      y: 150,
    });
  });

  it("adapts a box by translate+scale, scaling its size", () => {
    const adapted = adaptBoxToPocket({ x: 120, y: 220, width: 40, height: 20 }, source, target);
    expect(adapted).toEqual({ x: 410, y: 140, width: 20, height: 40 });
  });

  it("rotates an adapted point about the target pocket centre", () => {
    // Centre of target is (450, 200); (425,150) rotated 90 deg about it -> (500, 175).
    const rotated = adaptPointToPocket({ x: 150, y: 225 }, source, target, 90);
    expect(rotated.x).toBeCloseTo(500);
    expect(rotated.y).toBeCloseTo(175);
  });

  it("returns the axis-aligned bounding box for a rotated box", () => {
    const rotated = adaptBoxToPocket({ x: 120, y: 220, width: 40, height: 20 }, source, target, 90);
    // Unrotated adapted box is (410,140,20,40); rotating its corners
    // 90 deg about (450,200) gives an AABB of (470,160,40,20).
    expect(rotated.x).toBeCloseTo(470);
    expect(rotated.y).toBeCloseTo(160);
    expect(rotated.width).toBeCloseTo(40);
    expect(rotated.height).toBeCloseTo(20);
  });
});

describe("pocket portability helpers (pattern-matcher mirror)", () => {
  it("matches the segmenter implementation on the same inputs", () => {
    expect(patternAbsoluteToPocketRelative({ x: 150, y: 225 }, source)).toEqual(
      absoluteToPocketRelative({ x: 150, y: 225 }, source),
    );
    expect(patternAdaptPointToPocket({ x: 150, y: 225 }, source, target)).toEqual(
      adaptPointToPocket({ x: 150, y: 225 }, source, target),
    );
    expect(
      patternAdaptBoxToPocket({ x: 120, y: 220, width: 40, height: 20 }, source, target),
    ).toEqual(adaptBoxToPocket({ x: 120, y: 220, width: 40, height: 20 }, source, target));
  });
});
