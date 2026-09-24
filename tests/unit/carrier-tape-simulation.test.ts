import { describe, expect, it } from "vitest";
import { build15FrameSequence } from "@/components/vision/standard/tools/pattern-matching/carrier-tape-simulation/carrier-tape-assets";
import {
  analyzeEmptyPocketReal,
  analyzeRule1Pin1Real,
  evaluatePocket,
} from "@/components/vision/standard/tools/pattern-matching/carrier-tape-simulation/carrier-tape-evaluator";
import type {
  MultiRuleToleranceParams,
  PocketDef,
} from "@/components/vision/standard/tools/pattern-matching/carrier-tape-simulation/types";

describe("Carrier Tape 15-Frame Sequence & Variations", () => {
  const frames = build15FrameSequence();

  it("generates exactly 15 frames", () => {
    expect(frames.length).toBe(15);
  });

  it("cycles through the 3 required variations: empty-device-device, device-device-empty, device-empty-device", () => {
    // Round 1
    expect(frames[0].variation).toBe("empty-device-device");
    expect(frames[1].variation).toBe("device-device-empty");
    expect(frames[2].variation).toBe("device-empty-device");

    // Round 2
    expect(frames[3].variation).toBe("empty-device-device");
    expect(frames[4].variation).toBe("device-device-empty");
    expect(frames[5].variation).toBe("device-empty-device");

    // Round 5
    expect(frames[12].variation).toBe("empty-device-device");
    expect(frames[13].variation).toBe("device-device-empty");
    expect(frames[14].variation).toBe("device-empty-device");
  });

  it("assigns pocket occupancy matching the variation pattern", () => {
    for (const f of frames) {
      expect(f.pockets.length).toBe(3);

      if (f.variation === "empty-device-device") {
        expect(f.pockets[0].occupancy).toBe("empty");
        expect(f.pockets[1].occupancy).toBe("device");
        expect(f.pockets[2].occupancy).toBe("device");
      } else if (f.variation === "device-device-empty") {
        expect(f.pockets[0].occupancy).toBe("device");
        expect(f.pockets[1].occupancy).toBe("device");
        expect(f.pockets[2].occupancy).toBe("empty");
      } else if (f.variation === "device-empty-device") {
        expect(f.pockets[0].occupancy).toBe("device");
        expect(f.pockets[1].occupancy).toBe("empty");
        expect(f.pockets[2].occupancy).toBe("device");
      }
    }
  });

  it("configures frames 1 to 3 as baseline normal with 0° rotation and normal lighting", () => {
    for (let i = 0; i < 3; i += 1) {
      const f = frames[i];
      expect(f.lightingMultiplier).toBe(1.0);

      for (const p of f.pockets) {
        if (p.occupancy === "device") {
          expect(p.rotationDeg).toBe(0);
          expect(p.chipModel).toBe("atmel");
          expect(p.pin1Corner).toBe("top-left");
        }
      }
    }
  });
});

describe("Carrier Tape Multi-Rule Evaluator & Short-Circuit Execution", () => {
  const defaultTolerances: MultiRuleToleranceParams = {
    marginTolerancePx: 8,
    angleToleranceDeg: 10.0,
    minMatchPercent: 80,
    greyscaleLevel: 170,
  };

  it("identifies empty pockets as EMPTY without executing device rules", () => {
    const emptyPocket: PocketDef = {
      pocketIndex: 0,
      x: 70,
      y: 135,
      width: 240,
      height: 290,
      occupancy: "empty",
      rotationDeg: 0,
      chipModel: "atmel",
      hasPin1Dot: false,
      pin1Corner: "top-left",
      hasLaserDefect: false,
    };

    const res = evaluatePocket(emptyPocket, defaultTolerances);
    expect(res.verdict).toBe("EMPTY");
    expect(res.occupancy).toBe("empty");
    expect(res.rule1Pin1).toBeNull();
    expect(res.rule2Pattern).toBeNull();
    expect(res.isRule2Skipped).toBe(false);
  });

  it("passes normal Atmel chip when both Pin 1 and Pattern match", () => {
    const normalPocket: PocketDef = {
      pocketIndex: 1,
      x: 360,
      y: 135,
      width: 240,
      height: 290,
      occupancy: "device",
      rotationDeg: 0,
      chipModel: "atmel",
      hasPin1Dot: true,
      pin1Corner: "top-left",
      hasLaserDefect: false,
    };

    const res = evaluatePocket(normalPocket, defaultTolerances);
    expect(res.verdict).toBe("PASS");
    expect(res.failedRuleIndex).toBeNull();
    expect(res.rule1Pin1?.isPass).toBe(true);
    expect(res.rule2Pattern?.isPass).toBe(true);
    expect(res.rule2Pattern?.score).toBe(100);
    expect(res.isRule2Skipped).toBe(false);
  });

  it("short-circuits Rule 2 when Rule 1 (Pin 1) fails due to inverted orientation (180°)", () => {
    const invertedPocket: PocketDef = {
      pocketIndex: 0,
      x: 70,
      y: 135,
      width: 240,
      height: 290,
      occupancy: "device",
      rotationDeg: 180,
      chipModel: "atmel",
      hasPin1Dot: true,
      pin1Corner: "bottom-right", // 180° inverted
      hasLaserDefect: false,
    };

    const res = evaluatePocket(invertedPocket, defaultTolerances);
    // Pin 1 fails
    expect(res.verdict).toBe("FAIL");
    expect(res.failedRuleIndex).toBe(1);
    expect(res.failedRuleName).toBe("Rule 1: Pin 1 Orientation Rule");
    expect(res.rule1Pin1?.isPass).toBe(false);

    // Rule 2 must be SKIPPED!
    expect(res.isRule2Skipped).toBe(true);
    expect(res.rule2Pattern?.isSkipped).toBe(true);
    expect(res.rule2Pattern?.isPass).toBe(false);
  });

  it("short-circuits Rule 2 when Pin 1 index hole is missing", () => {
    const missingPin1Pocket: PocketDef = {
      pocketIndex: 0,
      x: 70,
      y: 135,
      width: 240,
      height: 290,
      occupancy: "device",
      rotationDeg: 0,
      chipModel: "atmel",
      hasPin1Dot: false,
      pin1Corner: "top-left",
      hasLaserDefect: false,
    };

    const res = evaluatePocket(missingPin1Pocket, defaultTolerances);
    expect(res.verdict).toBe("FAIL");
    expect(res.failedRuleIndex).toBe(1);
    expect(res.isRule2Skipped).toBe(true);
  });

  it("evaluates angle tolerance: passes within tolerance, fails when exceeding tolerance", () => {
    const tiltedPocket: PocketDef = {
      pocketIndex: 2,
      x: 650,
      y: 135,
      width: 240,
      height: 290,
      occupancy: "device",
      rotationDeg: 6.5,
      chipModel: "atmel",
      hasPin1Dot: true,
      pin1Corner: "top-left",
      hasLaserDefect: false,
    };

    // With 10° tolerance, 6.5° <= 10° -> PASS
    const lenient = evaluatePocket(tiltedPocket, {
      ...defaultTolerances,
      angleToleranceDeg: 10.0,
    });
    expect(lenient.verdict).toBe("PASS");
    expect(lenient.rule1Pin1?.isPass).toBe(true);

    // With 5° tolerance, 6.5° > 5° -> FAIL (Rule 1) and Rule 2 skipped
    const strict = evaluatePocket(tiltedPocket, {
      ...defaultTolerances,
      angleToleranceDeg: 5.0,
    });
    expect(strict.verdict).toBe("FAIL");
    expect(strict.failedRuleIndex).toBe(1);
    expect(strict.isRule2Skipped).toBe(true);
  });

  it("evaluates Rule 2 Pattern failure when Rule 1 passes but chip has laser defect", () => {
    const defectPocket: PocketDef = {
      pocketIndex: 1,
      x: 360,
      y: 135,
      width: 240,
      height: 290,
      occupancy: "device",
      rotationDeg: 0,
      chipModel: "atmel",
      hasPin1Dot: true,
      pin1Corner: "top-left",
      hasLaserDefect: true, // Laser marking defect
    };

    const res = evaluatePocket(defectPocket, defaultTolerances);
    // Rule 1 passed because Pin 1 is properly aligned
    expect(res.rule1Pin1?.isPass).toBe(true);

    // Rule 2 was evaluated and failed
    expect(res.verdict).toBe("FAIL");
    expect(res.failedRuleIndex).toBe(2);
    expect(res.failedRuleName).toBe("Rule 2: greyscale-pattern-match-24-box");
    expect(res.rule2Pattern?.isPass).toBe(false);
    expect(res.rule2Pattern?.isSkipped).toBe(false);
    expect(res.isRule2Skipped).toBe(false);
    expect(res.rule2Pattern?.score).toBeLessThan(80);
    expect(res.rule2Pattern?.boxResults?.length).toBe(24);
  });
});

describe("Carrier Tape Real Computer Vision Pixel Analysis Engine", () => {
  const tolerances: MultiRuleToleranceParams = {
    marginTolerancePx: 8,
    angleToleranceDeg: 10.0,
    minMatchPercent: 80,
    greyscaleLevel: 170,
  };

  function createPixelBuffer(width: number, height: number, fillLuma = 10): Uint8ClampedArray {
    const data = new Uint8ClampedArray(width * height * 4);

    for (let i = 0; i < width * height; i += 1) {
      data[i * 4] = fillLuma;
      data[i * 4 + 1] = fillLuma;
      data[i * 4 + 2] = fillLuma;
      data[i * 4 + 3] = 255;
    }

    return data;
  }

  it("detects empty pocket cavity from flat dark pixel buffer", () => {
    const w = 141;
    const h = 152;
    const emptyRgba = createPixelBuffer(w, h, 10);
    const isEmpty = analyzeEmptyPocketReal({ rgba: emptyRgba, width: w, height: h });
    expect(isEmpty).toBe(true);
  });

  it("identifies occupied pocket cavity when pins and markings create high contrast", () => {
    const w = 141;
    const h = 152;
    const occupiedRgba = createPixelBuffer(w, h, 30);

    // Add bright metallic pins and text markings
    for (let y = 50; y < 100; y += 1) {
      for (let x = 40; x < 90; x += 1) {
        const idx = (y * w + x) * 4;
        occupiedRgba[idx] = 160;
        occupiedRgba[idx + 1] = 160;
        occupiedRgba[idx + 2] = 160;
      }
    }

    const isEmpty = analyzeEmptyPocketReal({ rgba: occupiedRgba, width: w, height: h });
    expect(isEmpty).toBe(false);
  });

  it("evaluates real Pin 1 indentation in top-left quadrant", () => {
    const w = 141;
    const h = 152;
    const rgba = createPixelBuffer(w, h, 40); // Chip package grey
    const dotX = 41;
    const dotY = 48;

    for (let dy = -6; dy <= 6; dy += 1) {
      for (let dx = -6; dx <= 6; dx += 1) {
        if (dx * dx + dy * dy <= 36) {
          const idx = ((dotY + dy) * w + (dotX + dx)) * 4;
          rgba[idx] = 8;
          rgba[idx + 1] = 8;
          rgba[idx + 2] = 8;
        }
      }
    }

    const r1 = analyzeRule1Pin1Real({ rgba, width: w, height: h }, tolerances);
    expect(r1.hasPin1Found).toBe(true);
    expect(r1.isPass).toBe(true);
    expect(r1.offsetPx).toBeLessThanOrEqual(tolerances.marginTolerancePx);
    expect(Math.abs(r1.angleDeg)).toBeLessThanOrEqual(tolerances.angleToleranceDeg);
  });

  it("detects missing Pin 1 dimple failure", () => {
    const w = 141;
    const h = 152;
    const rgba = createPixelBuffer(w, h, 40); // Uniform grey package, no dimple stamped

    const r1 = analyzeRule1Pin1Real({ rgba, width: w, height: h }, tolerances);
    expect(r1.isPass).toBe(false);
    expect(r1.hasPin1Found).toBe(false);
    expect(r1.failureReason).toContain("Missing Dimple");
  });

  it("short-circuits Rule 2 when real pixel Pin 1 fails", () => {
    const w = 141;
    const h = 152;
    const rgba = createPixelBuffer(w, h, 40); // Missing Pin 1 dimple

    // Add metallic pins so cavity is recognized as an occupied device pocket
    for (let y = 50; y < 100; y += 1) {
      for (let x = 40; x < 90; x += 1) {
        const idx = (y * w + x) * 4;
        rgba[idx] = 160;
        rgba[idx + 1] = 160;
        rgba[idx + 2] = 160;
      }
    }

    const pocket: PocketDef = {
      pocketIndex: 0,
      x: 36,
      y: 68,
      width: w,
      height: h,
      occupancy: "device",
      rotationDeg: 0,
      chipModel: "atmel",
      hasPin1Dot: false,
      pin1Corner: "top-left",
      hasLaserDefect: false,
    };

    const res = evaluatePocket(pocket, tolerances, { rgba, width: w, height: h });
    expect(res.verdict).toBe("FAIL");
    expect(res.failedRuleIndex).toBe(1);
    expect(res.isRule2Skipped).toBe(true);
    expect(res.rule2Pattern?.isSkipped).toBe(true);
    expect(res.rule2Pattern?.score).toBe(0);
  });
});
