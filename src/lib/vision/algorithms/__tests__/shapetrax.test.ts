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

  it("matches contour shape and computes centroid, orientation angle, and scale", () => {
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

    // Spec ShapeTrax3 §5: the raw angle/scale must be checked BEFORE
    // any clamping. This ellipse's raw scale is 66.5% (measured), so
    // a 90–110 range must FAIL — the old clamp-then-check tautology
    // passed it by clamping 66.5 into range first, and the old 50%
    // score floor hid the true coherence score (78.4).
    const narrowRange = matchShapeTrax({
      imageData,
      roi: { x: 10, y: 10, width: 80, height: 80 },
      minMatchPercent: 70,
      contrastThreshold: 25,
      angleRangeDeg: 180,
      scaleRangeMin: 90,
      scaleRangeMax: 110,
    });

    expect(narrowRange.hasMatchFound).toBe(true);
    expect(narrowRange.x).toBeCloseTo(50, 1);
    expect(narrowRange.y).toBeCloseTo(50, 1);
    expect(narrowRange.score).toBeGreaterThanOrEqual(70);
    expect(narrowRange.scalePct).toBeCloseTo(66.5, 0);
    expect(narrowRange.isPass).toBe(false);

    // With a range that actually contains the measured raw scale,
    // the same shape passes on its honest score and angle.
    const wideRange = matchShapeTrax({
      imageData,
      roi: { x: 10, y: 10, width: 80, height: 80 },
      minMatchPercent: 70,
      contrastThreshold: 25,
      angleRangeDeg: 180,
      scaleRangeMin: 60,
      scaleRangeMax: 110,
    });

    expect(wideRange.isPass).toBe(true);
  });
});
