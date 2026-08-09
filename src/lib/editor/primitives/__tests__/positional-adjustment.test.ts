import { AnchorSourceType } from "@/lib/editor/primitives/positional-adjustment";
import { describe, it, expect } from "vitest";
import {
  POSITIONAL_ADJUSTMENT_DEFAULTS,
  applyAdjustment,
  composeAdjustments,
  rotatePoint,
  validatePositionalAdjustment,
  type PositionalAdjustmentParams,
} from "../positional-adjustment";

describe("validatePositionalAdjustment", () => {
  it("accepts defaults", () => {
    expect(validatePositionalAdjustment(POSITIONAL_ADJUSTMENT_DEFAULTS)).toEqual([]);
  });

  it("rejects unknown anchorSource", () => {
    const errs = validatePositionalAdjustment({
      ...POSITIONAL_ADJUSTMENT_DEFAULTS,
      anchorSource: "camera" as unknown as (typeof POSITIONAL_ADJUSTMENT_DEFAULTS)["anchorSource"],
    });
    expect(errs.map((e) => e.code)).toContain("adjust.anchorSource.unknown");
  });

  it("rejects non-finite fields", () => {
    const errs = validatePositionalAdjustment({
      ...POSITIONAL_ADJUSTMENT_DEFAULTS,
      anchor: { x: Number.NaN, y: 0 },
      translate: { x: Number.POSITIVE_INFINITY, y: 0 },
      rotate: Number.NaN,
    });
    const codes = errs.map((e) => e.code);
    expect(codes).toContain("adjust.anchor.finite");
    expect(codes).toContain("adjust.translate.finite");
    expect(codes).toContain("adjust.rotate.finite");
  });

  it("rejects rotate outside [-2π, 2π]", () => {
    const errs = validatePositionalAdjustment({ ...POSITIONAL_ADJUSTMENT_DEFAULTS, rotate: 10 });
    expect(errs.map((e) => e.code)).toContain("adjust.rotate.range");
  });

  it("requires referenceRuleId when anchorSource is rule-centroid", () => {
    const errs = validatePositionalAdjustment({
      ...POSITIONAL_ADJUSTMENT_DEFAULTS,
      anchorSource: AnchorSourceType.RuleCentroid,
      referenceRuleId: "",
    });
    expect(errs.map((e) => e.code)).toContain("adjust.referenceRuleId.missing");
  });
});

describe("rotatePoint", () => {
  it("rotates 90 degrees around origin (Y-down)", () => {
    const r = rotatePoint({ x: 10, y: 0 }, { x: 0, y: 0 }, Math.PI / 2);
    expect(r.x).toBeCloseTo(0, 6);
    expect(r.y).toBeCloseTo(10, 6);
  });

  it("rotate 0 is identity", () => {
    const r = rotatePoint({ x: 3, y: 5 }, { x: 1, y: 1 }, 0);
    expect(r).toEqual({ x: 3, y: 5 });
  });
});

describe("applyAdjustment", () => {
  it("identity params return the same rect as bbox", () => {
    const r = applyAdjustment(
      { x: 10, y: 20, width: 30, height: 40 },
      POSITIONAL_ADJUSTMENT_DEFAULTS,
    );
    expect(r.bbox).toEqual({ x: 10, y: 20, width: 30, height: 40 });
  });

  it("translate-only shifts bbox and keeps size", () => {
    const r = applyAdjustment(
      { x: 10, y: 20, width: 30, height: 40 },
      { ...POSITIONAL_ADJUSTMENT_DEFAULTS, translate: { x: 5, y: -5 } },
    );
    expect(r.bbox).toEqual({ x: 15, y: 15, width: 30, height: 40 });
  });

  it("90-degree rotation around anchor swaps bbox dimensions", () => {
    const params: PositionalAdjustmentParams = {
      ...POSITIONAL_ADJUSTMENT_DEFAULTS,
      anchor: { x: 0, y: 0 },
      rotate: Math.PI / 2,
    };
    const r = applyAdjustment({ x: 0, y: 0, width: 10, height: 20 }, params);
    expect(r.bbox.width).toBeCloseTo(20, 6);
    expect(r.bbox.height).toBeCloseTo(10, 6);
  });

  it("returns four distinct corners in TL, TR, BR, BL order", () => {
    const r = applyAdjustment({ x: 0, y: 0, width: 4, height: 6 }, POSITIONAL_ADJUSTMENT_DEFAULTS);
    expect(r.corners).toEqual([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 6 },
      { x: 0, y: 6 },
    ]);
  });
});

describe("composeAdjustments", () => {
  it("composes translations under parent rotation", () => {
    const parent: PositionalAdjustmentParams = {
      ...POSITIONAL_ADJUSTMENT_DEFAULTS,
      translate: { x: 10, y: 0 },
      rotate: Math.PI / 2,
    };
    const child: PositionalAdjustmentParams = {
      ...POSITIONAL_ADJUSTMENT_DEFAULTS,
      translate: { x: 5, y: 0 },
    };
    const c = composeAdjustments(parent, child);
    // parent 90-degree rotation turns child (5, 0) into (0, 5) then adds to parent (10, 0)
    expect(c.translate.x).toBeCloseTo(10, 6);
    expect(c.translate.y).toBeCloseTo(5, 6);
    expect(c.rotate).toBeCloseTo(Math.PI / 2, 6);
  });

  it("composing with identity is a no-op on translate/rotate", () => {
    const parent: PositionalAdjustmentParams = {
      ...POSITIONAL_ADJUSTMENT_DEFAULTS,
      translate: { x: 3, y: 4 },
      rotate: 0.5,
    };
    const c = composeAdjustments(parent, POSITIONAL_ADJUSTMENT_DEFAULTS);
    expect(c.translate.x).toBeCloseTo(parent.translate.x, 6);
    expect(c.translate.y).toBeCloseTo(parent.translate.y, 6);
    expect(c.rotate).toBeCloseTo(parent.rotate, 6);
  });
});
