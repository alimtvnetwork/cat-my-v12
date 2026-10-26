import { describe, it, expect } from "vitest";
import { extractContourPoints, matchShapeTrax } from "../shapetrax";
import type { WorkpieceImageData } from "@/lib/vision/workpiece-rule-analyzer";

describe("ShapeTrax3 Contour Vectorization & Matching", () => {
  it("extracts sub-pixel contour edge points from high-contrast boundary", () => {
    const imgW = 60;
    const imgH = 60;
    const rgba = new Uint8ClampedArray(imgW * imgH * 4);

    // Create a dark rectangular block inside a bright background
    for (let y = 0; y < imgH; y += 1) {
      for (let x = 0; x < imgW; x += 1) {
        const idx = (y * imgW + x) * 4;
        const isInsideBlock = x >= 15 && x <= 45 && y >= 20 && y <= 40;
        const val = isInsideBlock ? 20 : 220;

        rgba[idx] = val;
        rgba[idx + 1] = val;
        rgba[idx + 2] = val;
        rgba[idx + 3] = 255;
      }
    }

    const imageData: WorkpieceImageData = {
      width: imgW,
      height: imgH,
      rgba,
    };

    const contours = extractContourPoints({
      imageData,
      roi: { x: 5, y: 5, width: 50, height: 50 },
      contrastThreshold: 30,
    });

    expect(contours.length).toBeGreaterThan(10);
    for (const pt of contours) {
      expect(pt.magnitude).toBeGreaterThanOrEqual(30);
      expect(Math.abs(pt.dirX ** 2 + pt.dirY ** 2 - 1.0)).toBeLessThan(0.01);
    }
  });

  it("fails honestly when no reference model is supplied (never self-matches)", () => {
    const imgW = 100;
    const imgH = 100;
    const rgba = new Uint8ClampedArray(imgW * imgH * 4);

    for (let y = 0; y < imgH; y += 1) {
      for (let x = 0; x < imgW; x += 1) {
        const idx = (y * imgW + x) * 4;
        const dx = x - 50;
        const dy = y - 50;
        const isInside = (dx / 20) ** 2 + (dy / 10) ** 2 <= 1.0;
        const val = isInside ? 30 : 210;

        rgba[idx] = val;
        rgba[idx + 1] = val;
        rgba[idx + 2] = val;
        rgba[idx + 3] = 255;
      }
    }

    const result = matchShapeTrax({
      imageData: { width: imgW, height: imgH, rgba },
      roi: { x: 10, y: 10, width: 80, height: 80 },
      minMatchPercent: 70,
      contrastThreshold: 25,
      angleRangeDeg: 180,
      scaleRangeMin: 60,
      scaleRangeMax: 110,
    });

    expect(result.hasMatchFound).toBe(false);
    expect(result.isPass).toBe(false);
    expect(result.score).toBe(0);
    expect(result.modelPointCount).toBe(0);
    expect(result.matchedPointCount).toBe(0);
    expect(result.reason).toContain("no reference model");
  });

  it("matches a stored model against the test ROI and gates raw angle/scale", () => {
    const imgW = 100;
    const imgH = 100;
    const rgba = new Uint8ClampedArray(imgW * imgH * 4);

    // Create an elongated shape centered at (50, 50)
    for (let y = 0; y < imgH; y += 1) {
      for (let x = 0; x < imgW; x += 1) {
        const idx = (y * imgW + x) * 4;
        const dx = x - 50;
        const dy = y - 50;
        // Ellipse (dx/20)^2 + (dy/10)^2 <= 1
        const isInside = (dx / 20) ** 2 + (dy / 10) ** 2 <= 1.0;
        const val = isInside ? 30 : 210;

        rgba[idx] = val;
        rgba[idx + 1] = val;
        rgba[idx + 2] = val;
        rgba[idx + 3] = 255;
      }
    }

    const imageData: WorkpieceImageData = {
      width: imgW,
      height: imgH,
      rgba,
    };

    // Model-local ellipse boundary, same size as the test shape.
    const sameSizeModel = Array.from({ length: 120 }, (_, i) => {
      const t = (i / 120) * Math.PI * 2;

      return { x: 20 * Math.cos(t), y: 10 * Math.sin(t) };
    });

    // Spec ShapeTrax3 §5: the raw angle/scale must be checked BEFORE
    // any clamping. A model taught at 1.5x the test shape measures a
    // raw scale of ~66.7%, so a 90–110 range must FAIL — the old
    // clamp-then-check tautology would have passed it by clamping
    // into range first.
    const bigModel = Array.from({ length: 120 }, (_, i) => {
      const t = (i / 120) * Math.PI * 2;

      return { x: 30 * Math.cos(t), y: 15 * Math.sin(t) };
    });

    const narrowRange = matchShapeTrax({
      imageData,
      roi: { x: 10, y: 10, width: 80, height: 80 },
      minMatchPercent: 70,
      contrastThreshold: 25,
      angleRangeDeg: 180,
      scaleRangeMin: 90,
      scaleRangeMax: 110,
      model: bigModel,
    });

    expect(narrowRange.hasMatchFound).toBe(true);
    expect(narrowRange.x).toBeCloseTo(50, 1);
    expect(narrowRange.y).toBeCloseTo(50, 1);
    expect(narrowRange.score).toBeGreaterThanOrEqual(70);
    // Raw measured scale (RMS estimate for this sampled contour set is
    // ~62.8, not the nominal 66.7 — the test contours are grid-sampled
    // gradient points, not the uniform boundary the model samples).
    // What matters for the gate is that it is reported raw, well
    // outside 90–110, and fails the gate instead of being clamped in.
    expect(narrowRange.scalePct).toBeLessThan(90);
    expect(narrowRange.scalePct).toBeGreaterThan(50);
    expect(narrowRange.modelPointCount).toBe(120);
    expect(narrowRange.isPass).toBe(false);

    // With a range that actually contains the measured raw scale,
    // the same-size model passes; matchedPointCount is measured
    // from the model, not derived from the test contour count.
    // (templatePoints alias accepted as well as `model`.)
    const wideRange = matchShapeTrax({
      imageData,
      roi: { x: 10, y: 10, width: 80, height: 80 },
      minMatchPercent: 70,
      contrastThreshold: 25,
      angleRangeDeg: 180,
      scaleRangeMin: 60,
      scaleRangeMax: 110,
      templatePoints: sameSizeModel,
    });

    expect(wideRange.isPass).toBe(true);
    expect(wideRange.modelPointCount).toBe(120);
    expect(wideRange.matchedPointCount).toBeGreaterThan(0);
    expect(wideRange.matchedPointCount).toBeLessThanOrEqual(120);
    expect(wideRange.score).toBeCloseTo((wideRange.matchedPointCount / 120) * 100, 0);
  });
});
