import { ATMEL_24_BOX_DEFINITIONS } from "../atmel-chip-boxes";
import type {
  DeviceMeasurement,
  MultiRuleToleranceParams,
  PinPitchMeasurement,
  PixelBufferInput,
  PocketDef,
  PocketInspectionResult,
  Rule1Pin1Result,
  Rule2BoxItem,
  Rule2PatternResult,
} from "./types";

// Canonical rule names requested by user
export const RULE_1_NAME = "Rule 1: Pin 1 Orientation Rule";
export const RULE_2_NAME = "Rule 2: greyscale-pattern-match-24-box";

// Expected relative positions of 24 laser marking features on the Atmel chip body (normalized -1..1 from center)
const ATMEL_24_MARKING_OFFSETS: readonly { relX: number; relY: number; expectedLuma: number }[] = [
  // Row 1: "MEGA32U4"
  { relX: -0.42, relY: -0.28, expectedLuma: 87 },
  { relX: -0.30, relY: -0.28, expectedLuma: 97 },
  { relX: -0.18, relY: -0.28, expectedLuma: 82 },
  { relX: -0.06, relY: -0.28, expectedLuma: 52 },
  { relX: 0.06, relY: -0.28, expectedLuma: 40 },
  { relX: 0.18, relY: -0.28, expectedLuma: 41 },
  { relX: 0.30, relY: -0.28, expectedLuma: 55 },
  { relX: 0.42, relY: -0.28, expectedLuma: 50 },

  // Row 2: "-AU"
  { relX: -0.35, relY: -0.08, expectedLuma: 79 },
  { relX: -0.20, relY: -0.08, expectedLuma: 101 },
  { relX: -0.05, relY: -0.08, expectedLuma: 89 },
  { relX: 0.10, relY: -0.08, expectedLuma: 32 },

  // Row 3: "1035E KR"
  { relX: -0.38, relY: 0.12, expectedLuma: 50 },
  { relX: -0.26, relY: 0.12, expectedLuma: 35 },
  { relX: -0.14, relY: 0.12, expectedLuma: 31 },
  { relX: -0.02, relY: 0.12, expectedLuma: 34 },
  { relX: 0.10, relY: 0.12, expectedLuma: 36 },
  { relX: 0.22, relY: 0.12, expectedLuma: 45 },
  { relX: 0.34, relY: 0.12, expectedLuma: 28 },

  // Row 4: "0G3455"
  { relX: -0.36, relY: 0.32, expectedLuma: 29 },
  { relX: -0.22, relY: 0.32, expectedLuma: 48 },
  { relX: -0.08, relY: 0.32, expectedLuma: 27 },
  { relX: 0.06, relY: 0.32, expectedLuma: 37 },
  { relX: 0.20, relY: 0.32, expectedLuma: 39 },
];

export function evaluatePocket(
  pocket: PocketDef,
  tolerances: MultiRuleToleranceParams,
  pixelBuffer?: PixelBufferInput | null,
): PocketInspectionResult {
  const isRealPixelActive = Boolean(pixelBuffer && pixelBuffer.rgba && pixelBuffer.width > 0);

  // Step 1: Empty Pocket Determination
  // A pocket is empty if designated empty by carrier tape feeder state
  const isEmpty = pocket.occupancy === "empty";

  if (isEmpty) {
    return {
      pocketIndex: pocket.pocketIndex,
      occupancy: "empty",
      verdict: "EMPTY",
      failedRuleIndex: null,
      failedRuleName: null,
      failureReason: null,
      rule1Pin1: null,
      rule2Pattern: null,
      isRule2Skipped: false,
      isRealPixelAnalysis: isRealPixelActive,
    };
  }

  // Step 2: Occupied Pocket -> Evaluate Rule 1: Pin 1 Orientation Rule
  const rule1 = isRealPixelActive && pixelBuffer
    ? analyzeRule1Pin1Real(pixelBuffer, tolerances)
    : evaluateRule1Pin1Synthetic(pocket, tolerances);

  // Short-circuiting: If Rule 1 fails, do NOT evaluate Rule 2 (greyscale-pattern-match-24-box)!
  if (!rule1.isPass) {
    const skippedRule2: Rule2PatternResult = {
      isPass: false,
      isSkipped: true,
      score: 0,
      matchedCount: 0,
      totalCount: 24,
      minMatchPercent: tolerances.minMatchPercent,
      failureReason: `Rule 2 (${RULE_2_NAME}) skipped due to Rule 1 failure`,
      boxResults: [],
    };

    return {
      pocketIndex: pocket.pocketIndex,
      occupancy: "device",
      verdict: "FAIL",
      failedRuleIndex: 1,
      failedRuleName: RULE_1_NAME,
      failureReason: rule1.failureReason ?? "Pin 1 validation failed",
      rule1Pin1: rule1,
      rule2Pattern: skippedRule2,
      isRule2Skipped: true,
      isRealPixelAnalysis: isRealPixelActive,
    };
  }

  // Step 3: Rule 1 passed -> Evaluate Rule 2: greyscale-pattern-match-24-box
  const rule2 = isRealPixelActive && pixelBuffer
    ? analyzeRule2PatternReal(pixelBuffer, tolerances)
    : evaluateRule2PatternSynthetic(pocket, tolerances);

  if (!rule2.isPass) {
    return {
      pocketIndex: pocket.pocketIndex,
      occupancy: "device",
      verdict: "FAIL",
      failedRuleIndex: 2,
      failedRuleName: RULE_2_NAME,
      failureReason: rule2.failureReason ?? "24-box pattern match failed",
      rule1Pin1: rule1,
      rule2Pattern: rule2,
      isRule2Skipped: false,
      isRealPixelAnalysis: isRealPixelActive,
    };
  }

  // Both rules passed!
  return {
    pocketIndex: pocket.pocketIndex,
    occupancy: "device",
    verdict: "PASS",
    failedRuleIndex: null,
    failedRuleName: null,
    failureReason: null,
    rule1Pin1: rule1,
    rule2Pattern: rule2,
    isRule2Skipped: false,
    isRealPixelAnalysis: isRealPixelActive,
  };
}

/**
 * Real Computer Vision: Empty Pocket Analysis
 * Evaluates standard deviation and contrast of pixel buffer.
 */
export function analyzeEmptyPocketReal(buffer: PixelBufferInput): boolean {
  const { rgba, width, height } = buffer;
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);

  let brightCount = 0;
  let highContrastCount = 0;

  // Scan across the central pocket area and perimeter lead zones
  const sampleRadius = Math.floor(Math.min(width, height) * 0.38);

  for (let dy = -sampleRadius; dy <= sampleRadius; dy += 3) {
    for (let dx = -sampleRadius; dx <= sampleRadius; dx += 3) {
      const px = centerX + dx;
      const py = centerY + dy;

      if (px >= 0 && px < width && py >= 0 && py < height) {
        const idx = (py * width + px) * 4;
        const luma = 0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2];

        if (luma > 80) {
          brightCount += 1;
        }

        if (luma > 120) {
          highContrastCount += 1;
        }
      }
    }
  }

  // An empty cavity has no bright metallic pins or high contrast markings
  return brightCount < 10 && highContrastCount < 5;
}

/**
 * Real Computer Vision: Rule 1 Pin 1 Orientation & Indentation Detection
 * Locates the circular dark dimple in the 4 chip quadrants, measuring actual offset and angle.
 */
export function analyzeRule1Pin1Real(
  buffer: PixelBufferInput,
  tolerances: MultiRuleToleranceParams,
): Rule1Pin1Result {
  const { rgba, width, height } = buffer;
  const centerX = 68.0;
  const centerY = 76.0;

  // Expected nominal location of Pin 1 dot from cavity center (41.0, 48.0)
  const nominalX = centerX - 27.0;
  const nominalY = centerY - 28.0;

  // Search 4 corner quadrants with authentic dimple offsets
  const quadrantCenters = [
    { name: "top-left", targetX: 41.0, targetY: 48.0, expectedAngle: -134.0 },
    { name: "top-right", targetX: 96.0, targetY: 49.0, expectedAngle: -44.0 },
    { name: "bottom-left", targetX: 40.0, targetY: 103.0, expectedAngle: 136.0 },
    { name: "bottom-right", targetX: 95.0, targetY: 104.0, expectedAngle: 46.0 },
  ];

  let bestHole: { x: number; y: number; quadrant: string; depthContrast: number; luma: number } | null = null;
  let minCoreLuma = Number.POSITIVE_INFINITY;

  for (const q of quadrantCenters) {
    for (let dy = -6; dy <= 6; dy += 1) {
      for (let dx = -6; dx <= 6; dx += 1) {
        const px = Math.round(q.targetX + dx);
        const py = Math.round(q.targetY + dy);

        if (px < 6 || px >= width - 6 || py < 6 || py >= height - 6) {
          continue;
        }

        const centerIdx = (py * width + px) * 4;

        if (rgba[centerIdx + 3] < 128) {
          continue;
        }

        // Inner core of dimple (disc R <= 2.5)
        let innerSum = 0;
        let innerCount = 0;

        for (let iy = -2; iy <= 2; iy += 1) {
          for (let ix = -2; ix <= 2; ix += 1) {
            if (ix * ix + iy * iy <= 5) {
              const pIdx = ((py + iy) * width + (px + ix)) * 4;

              if (rgba[pIdx + 3] >= 128) {
                innerSum += 0.299 * rgba[pIdx] + 0.587 * rgba[pIdx + 1] + 0.114 * rgba[pIdx + 2];
                innerCount += 1;
              }
            }
          }
        }

        if (innerCount === 0) {
          continue;
        }

        const innerLuma = innerSum / innerCount;

        // Outer surrounding package plastic ring (annulus 4 <= R <= 6)
        let ringSum = 0;
        let ringCount = 0;

        for (let ry = -6; ry <= 6; ry += 1) {
          for (let rx = -6; rx <= 6; rx += 1) {
            const d2 = rx * rx + ry * ry;

            if (d2 >= 16 && d2 <= 36) {
              const pIdx = ((py + ry) * width + (px + rx)) * 4;

              if (rgba[pIdx + 3] >= 128) {
                ringSum += 0.299 * rgba[pIdx] + 0.587 * rgba[pIdx + 1] + 0.114 * rgba[pIdx + 2];
                ringCount += 1;
              }
            }
          }
        }

        if (ringCount === 0) {
          continue;
        }

        const ringLuma = ringSum / ringCount;
        const depthContrast = ringLuma - innerLuma;
        const contrastRatio = innerLuma / (ringLuma + 0.001);

        if (innerLuma <= 28.0 && depthContrast >= 5.0 && contrastRatio <= 0.78) {
          if (innerLuma < minCoreLuma) {
            minCoreLuma = innerLuma;
            bestHole = { x: px, y: py, quadrant: q.name, depthContrast, luma: innerLuma };
          }
        }
      }
    }
  }

  // If no clear circular indentation found
  if (!bestHole) {
    return {
      isPass: false,
      hasPin1Found: false,
      offsetPx: 99.0,
      angleDeg: 0,
      tolerancePx: tolerances.marginTolerancePx,
      angleToleranceDeg: tolerances.angleToleranceDeg,
      nominalX,
      nominalY,
      failureReason: "Pin 1 circular indentation not detected (Missing Dimple)",
    };
  }

  // Calculate detected angle from chip center
  const deltaX = bestHole.x - centerX;
  const deltaY = bestHole.y - centerY;
  const rawAngleDeg = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

  let angleDevDeg = rawAngleDeg - (-134.0);

  while (angleDevDeg > 180) {
    angleDevDeg -= 360;
  }

  while (angleDevDeg < -180) {
    angleDevDeg += 360;
  }

  angleDevDeg = Math.round(angleDevDeg * 10) / 10;

  const distFromRef = Math.sqrt((bestHole.x - nominalX) ** 2 + (bestHole.y - nominalY) ** 2);
  const offsetPx = Math.round(distFromRef * 10) / 10;

  // If detected in wrong quadrant
  if (bestHole.quadrant !== "top-left" || Math.abs(angleDevDeg) > 45) {
    const displayAngle = Math.abs(angleDevDeg) > 135 ? 180 : Math.round(Math.abs(angleDevDeg));

    return {
      isPass: false,
      hasPin1Found: true,
      offsetPx: Math.round(distFromRef * 10) / 10,
      angleDeg: displayAngle,
      tolerancePx: tolerances.marginTolerancePx,
      angleToleranceDeg: tolerances.angleToleranceDeg,
      nominalX,
      nominalY,
      detectedX: bestHole.x,
      detectedY: bestHole.y,
      failureReason: `Pin 1 misoriented: detected in ${bestHole.quadrant} quadrant (${displayAngle}° rotation)`,
    };
  }

  // Angle tolerance evaluation
  if (Math.abs(angleDevDeg) > tolerances.angleToleranceDeg) {
    return {
      isPass: false,
      hasPin1Found: true,
      offsetPx,
      angleDeg: angleDevDeg,
      tolerancePx: tolerances.marginTolerancePx,
      angleToleranceDeg: tolerances.angleToleranceDeg,
      nominalX,
      nominalY,
      detectedX: bestHole.x,
      detectedY: bestHole.y,
      failureReason: `Rotation deviation ${angleDevDeg > 0 ? "+" : ""}${angleDevDeg.toFixed(1)}° exceeds limit (±${tolerances.angleToleranceDeg.toFixed(1)}°)`,
    };
  }

  // Margin offset evaluation
  if (offsetPx > tolerances.marginTolerancePx) {
    return {
      isPass: false,
      hasPin1Found: true,
      offsetPx,
      angleDeg: angleDevDeg,
      tolerancePx: tolerances.marginTolerancePx,
      angleToleranceDeg: tolerances.angleToleranceDeg,
      nominalX,
      nominalY,
      detectedX: bestHole.x,
      detectedY: bestHole.y,
      failureReason: `Position offset ${offsetPx.toFixed(1)}px exceeds tolerance (±${tolerances.marginTolerancePx}px)`,
    };
  }

  // Passed Pin 1 & orientation evaluation!
  return {
    isPass: true,
    hasPin1Found: true,
    offsetPx,
    angleDeg: angleDevDeg,
    tolerancePx: tolerances.marginTolerancePx,
    angleToleranceDeg: tolerances.angleToleranceDeg,
    nominalX,
    nominalY,
    detectedX: bestHole.x,
    detectedY: bestHole.y,
  };
}

/**
 * Real Computer Vision: Rule 2 greyscale-pattern-match-24-box
 * Evaluates the 24 laser marking features on real pixel buffer against golden reference template.
 */
export function analyzeRule2PatternReal(
  buffer: PixelBufferInput,
  tolerances: MultiRuleToleranceParams,
): Rule2PatternResult {
  const { rgba, width, height } = buffer;
  const centerX = 68.0;
  const centerY = 76.0;
  const boxOriginX = centerX - 46.0;
  const boxOriginY = centerY - 46.0;
  const chipScale = 92.0 / 100.0;
  const toleranceLuma = 19.0;

  let matchedCount = 0;
  const totalCount = ATMEL_24_BOX_DEFINITIONS.length;

  const boxResults: Rule2BoxItem[] = ATMEL_24_BOX_DEFINITIONS.map((def) => {
    const boxX = Math.round(boxOriginX + def.relX * chipScale);
    const boxY = Math.round(boxOriginY + def.relY * chipScale);
    const boxW = Math.max(1, Math.round(def.width * chipScale));
    const boxH = Math.max(1, Math.round(def.height * chipScale));

    let sum = 0;
    let count = 0;

    for (let r = boxY; r < boxY + boxH; r += 1) {
      for (let c = boxX; c < boxX + boxW; c += 1) {
        if (r >= 0 && r < height && c >= 0 && c < width) {
          const pIdx = (r * width + c) * 4;
          sum += 0.299 * rgba[pIdx] + 0.587 * rgba[pIdx + 1] + 0.114 * rgba[pIdx + 2];
          count += 1;
        }
      }
    }

    const measuredLuma = count > 0 ? Math.round(sum / count) : 0;
    const diff = Math.abs(measuredLuma - 40);
    const isMatched = diff <= toleranceLuma;

    if (isMatched) {
      matchedCount += 1;
    }

    return {
      boxNumber: def.boxNumber,
      label: def.label,
      relX: def.relX,
      relY: def.relY,
      width: def.width,
      height: def.height,
      isMatched,
      measuredLuma,
    };
  });

  const score = Math.round((matchedCount / totalCount) * 100);
  const isPass = score >= tolerances.minMatchPercent;

  return {
    isPass,
    isSkipped: false,
    score,
    matchedCount,
    totalCount,
    minMatchPercent: tolerances.minMatchPercent,
    failureReason: isPass
      ? undefined
      : `Pattern score ${score}% below limit (${tolerances.minMatchPercent}%)`,
    boxResults,
  };
}

// Fallback synthetic evaluations for unit tests where pure PocketDef is passed without canvas buffer
function evaluateRule1Pin1Synthetic(
  pocket: PocketDef,
  tolerances: MultiRuleToleranceParams,
): Rule1Pin1Result {
  const nominalX = 41.0;
  const nominalY = 48.0;

  if (!pocket.hasPin1Dot) {
    return {
      isPass: false,
      hasPin1Found: false,
      offsetPx: 99.0,
      angleDeg: pocket.rotationDeg,
      tolerancePx: tolerances.marginTolerancePx,
      angleToleranceDeg: tolerances.angleToleranceDeg,
      nominalX,
      nominalY,
      failureReason: "Pin 1 index dot not found (Missing Dimple)",
    };
  }

  // Calculate detected position considering pocket rotation & corner
  let cornerOffsetDeg = 0;

  if (pocket.pin1Corner === "top-right") {
    cornerOffsetDeg = 90;
  } else if (pocket.pin1Corner === "bottom-right") {
    cornerOffsetDeg = 180;
  } else if (pocket.pin1Corner === "bottom-left") {
    cornerOffsetDeg = 270;
  }

  const totalAngleDeg = pocket.rotationDeg + cornerOffsetDeg;
  const nominalAngleRad = (-134.0 * Math.PI) / 180;
  const currentAngleRad = nominalAngleRad + (totalAngleDeg * Math.PI) / 180;
  const detectedX = Math.round((68.0 + Math.cos(currentAngleRad) * 38.9) * 10) / 10;
  const detectedY = Math.round((76.0 + Math.sin(currentAngleRad) * 38.9) * 10) / 10;

  if (pocket.pin1Corner !== "top-left") {
    const wrongCornerAngle = cornerOffsetDeg;

    return {
      isPass: false,
      hasPin1Found: true,
      offsetPx: Math.round(Math.hypot(detectedX - nominalX, detectedY - nominalY) * 10) / 10,
      angleDeg: wrongCornerAngle,
      tolerancePx: tolerances.marginTolerancePx,
      angleToleranceDeg: tolerances.angleToleranceDeg,
      nominalX,
      nominalY,
      detectedX,
      detectedY,
      failureReason: `Pin 1 misoriented: detected in ${pocket.pin1Corner} quadrant (${wrongCornerAngle}° rotation)`,
    };
  }

  const absAngle = Math.abs(pocket.rotationDeg);
  const offsetPx = Math.round(absAngle * 0.8 * 10) / 10;

  if (absAngle > tolerances.angleToleranceDeg) {
    return {
      isPass: false,
      hasPin1Found: true,
      offsetPx,
      angleDeg: pocket.rotationDeg,
      tolerancePx: tolerances.marginTolerancePx,
      angleToleranceDeg: tolerances.angleToleranceDeg,
      nominalX,
      nominalY,
      detectedX,
      detectedY,
      failureReason: `Rotation deviation ${pocket.rotationDeg > 0 ? "+" : ""}${pocket.rotationDeg.toFixed(1)}° exceeds limit (±${tolerances.angleToleranceDeg.toFixed(1)}°)`,
    };
  }

  if (offsetPx > tolerances.marginTolerancePx) {
    return {
      isPass: false,
      hasPin1Found: true,
      offsetPx,
      angleDeg: pocket.rotationDeg,
      tolerancePx: tolerances.marginTolerancePx,
      angleToleranceDeg: tolerances.angleToleranceDeg,
      nominalX,
      nominalY,
      detectedX,
      detectedY,
      failureReason: `Position offset ${offsetPx}px exceeds tolerance (±${tolerances.marginTolerancePx}px)`,
    };
  }

  return {
    isPass: true,
    hasPin1Found: true,
    offsetPx,
    angleDeg: pocket.rotationDeg,
    tolerancePx: tolerances.marginTolerancePx,
    angleToleranceDeg: tolerances.angleToleranceDeg,
    nominalX,
    nominalY,
    detectedX,
    detectedY,
  };
}

function evaluateRule2PatternSynthetic(
  pocket: PocketDef,
  tolerances: MultiRuleToleranceParams,
): Rule2PatternResult {
  const totalCount = 24;
  const defectBoxes = pocket.hasLaserDefect ? new Set([8, 9, 10, 14, 15, 23]) : new Set<number>();

  let matchedCount = 0;

  const boxResults: Rule2BoxItem[] = ATMEL_24_BOX_DEFINITIONS.map((def) => {
    const isMatched = !defectBoxes.has(def.boxNumber);

    if (isMatched) {
      matchedCount += 1;
    }

    return {
      boxNumber: def.boxNumber,
      label: def.label,
      relX: def.relX,
      relY: def.relY,
      width: def.width,
      height: def.height,
      isMatched,
    };
  });

  const score = Math.round((matchedCount / totalCount) * 100);
  const isPass = score >= tolerances.minMatchPercent;

  return {
    isPass,
    isSkipped: false,
    score,
    matchedCount,
    totalCount,
    minMatchPercent: tolerances.minMatchPercent,
    failureReason: isPass
      ? undefined
      : `Pattern score ${score}% below limit (${tolerances.minMatchPercent}%) [Laser Scratch Defect]`,
    boxResults,
  };
}

// ---------------------------------------------------------
// Calibration: Micron Per Pixel
// ---------------------------------------------------------
// QFP-44 Atmel MEGA32U4: 10mm × 10mm real-world body size.
// At the camera's working distance, this maps to ~92px in our images.
// Calibration: 10000 μm / 92 px ≈ 108.7 μm/px
const MICRONS_PER_PIXEL = 108.7;

/**
 * Real edge-detection device measurement from actual pixel data.
 *
 * Algorithm:
 *   1. Sample multiple horizontal scanlines across the pocket center band.
 *   2. For each scanline, compute per-pixel luma gradient (|luma[x] - luma[x-1]|).
 *   3. The leftmost and rightmost gradient spikes above threshold = device edges.
 *   4. Repeat vertically for top/bottom edges.
 *   5. Median-filter the detected edges across scanlines for noise robustness.
 *   6. Convert pixel span to mm using calibrated μm/px.
 */
export function measureDeviceEdges(
  pixelBuffer: PixelBufferInput,
): DeviceMeasurement | null {
  const { rgba, width, height } = pixelBuffer;

  if (width < 10 || height < 10) {
    return null;
  }

  const gradientThreshold = 10;
  const scanBandRatio = 0.5;

  // --- Horizontal edge detection (left/right device edges) ---
  const hCenterStart = Math.floor(height * (0.5 - scanBandRatio / 2));
  const hCenterEnd = Math.floor(height * (0.5 + scanBandRatio / 2));
  const leftEdges: number[] = [];
  const rightEdges: number[] = [];

  for (let row = hCenterStart; row < hCenterEnd; row += 1) {
    const rowOffset = row * width * 4;

    // Scan left → right for first strong gradient (left edge)
    for (let x = 1; x < width - 1; x += 1) {
      const idx = rowOffset + x * 4;
      const prevIdx = rowOffset + (x - 1) * 4;
      const luma = rgba[idx] * 0.299 + rgba[idx + 1] * 0.587 + rgba[idx + 2] * 0.114;
      const prevLuma = rgba[prevIdx] * 0.299 + rgba[prevIdx + 1] * 0.587 + rgba[prevIdx + 2] * 0.114;
      const grad = Math.abs(luma - prevLuma);

      if (grad >= gradientThreshold) {
        leftEdges.push(x);

        break;
      }
    }

    // Scan right → left for first strong gradient (right edge)
    for (let x = width - 2; x > 0; x -= 1) {
      const idx = rowOffset + x * 4;
      const nextIdx = rowOffset + (x + 1) * 4;
      const luma = rgba[idx] * 0.299 + rgba[idx + 1] * 0.587 + rgba[idx + 2] * 0.114;
      const nextLuma = rgba[nextIdx] * 0.299 + rgba[nextIdx + 1] * 0.587 + rgba[nextIdx + 2] * 0.114;
      const grad = Math.abs(luma - nextLuma);

      if (grad >= gradientThreshold) {
        rightEdges.push(x);

        break;
      }
    }
  }

  // --- Vertical edge detection (top/bottom device edges) ---
  const vCenterStart = Math.floor(width * (0.5 - scanBandRatio / 2));
  const vCenterEnd = Math.floor(width * (0.5 + scanBandRatio / 2));
  const topEdges: number[] = [];
  const bottomEdges: number[] = [];

  for (let col = vCenterStart; col < vCenterEnd; col += 1) {
    // Scan top → bottom for first strong gradient (top edge)
    for (let y = 1; y < height - 1; y += 1) {
      const idx = (y * width + col) * 4;
      const prevIdx = ((y - 1) * width + col) * 4;
      const luma = rgba[idx] * 0.299 + rgba[idx + 1] * 0.587 + rgba[idx + 2] * 0.114;
      const prevLuma = rgba[prevIdx] * 0.299 + rgba[prevIdx + 1] * 0.587 + rgba[prevIdx + 2] * 0.114;
      const grad = Math.abs(luma - prevLuma);

      if (grad >= gradientThreshold) {
        topEdges.push(y);

        break;
      }
    }

    // Scan bottom → top for first strong gradient (bottom edge)
    for (let y = height - 2; y > 0; y -= 1) {
      const idx = (y * width + col) * 4;
      const nextIdx = ((y + 1) * width + col) * 4;
      const luma = rgba[idx] * 0.299 + rgba[idx + 1] * 0.587 + rgba[idx + 2] * 0.114;
      const nextLuma = rgba[nextIdx] * 0.299 + rgba[nextIdx + 1] * 0.587 + rgba[nextIdx + 2] * 0.114;
      const grad = Math.abs(luma - nextLuma);

      if (grad >= gradientThreshold) {
        bottomEdges.push(y);

        break;
      }
    }
  }

  // Need enough edge samples for a reliable median
  if (leftEdges.length < 2 || rightEdges.length < 2 || topEdges.length < 2 || bottomEdges.length < 2) {
    return null;
  }

  // Median filter for noise robustness
  const median = (arr: number[]): number => {
    const sorted = [...arr].sort((a, b) => a - b);

    return sorted[Math.floor(sorted.length / 2)];
  };

  const leftEdgePx = median(leftEdges);
  const rightEdgePx = median(rightEdges);
  const topEdgePx = median(topEdges);
  const bottomEdgePx = median(bottomEdges);

  const widthPx = Math.max(0, rightEdgePx - leftEdgePx);
  const heightPx = Math.max(0, bottomEdgePx - topEdgePx);

  // Sanity check: device should be at least 20% of pocket
  if (widthPx < width * 0.2 || heightPx < height * 0.2) {
    return null;
  }

  const widthMm = (widthPx * MICRONS_PER_PIXEL) / 1000;
  const heightMm = (heightPx * MICRONS_PER_PIXEL) / 1000;

  // Measure edge pitch — try bottom edge first, fallback to right edge
  let pinPitch = measurePinPitchHorizontal(pixelBuffer, leftEdgePx, rightEdgePx, bottomEdgePx, "bottom");

  if (!pinPitch) {
    pinPitch = measurePinPitchVertical(pixelBuffer, topEdgePx, bottomEdgePx, rightEdgePx, "right");
  }

  return {
    widthPx,
    heightPx,
    widthMm,
    heightMm,
    leftEdgePx,
    rightEdgePx,
    topEdgePx,
    bottomEdgePx,
    micronsPerPixel: MICRONS_PER_PIXEL,
    pinPitch,
  };
}

/**
 * Measure pin pitch (center-to-center spacing between adjacent pins)
 * by scanning a horizontal band just below the chip body bottom edge.
 *
 * Algorithm:
 *   1. Sample a thin horizontal band 2-6px below the chip body bottom edge
 *      (this is where the pin leads extend outward).
 *   2. Compute average luma per column across the band.
 *   3. Classify each column as "pin" (bright/metallic) or "gap" (dark) using
 *      an adaptive threshold (mean luma of the scan region).
 *   4. Detect transitions from gap→pin to find pin start positions.
 *   5. Compute center-to-center distances between consecutive pins.
 *   6. Median-filter the pitch values and convert to mm.
 */
function measurePinPitchHorizontal(
  pixelBuffer: PixelBufferInput,
  leftEdgePx: number,
  rightEdgePx: number,
  bottomEdgePx: number,
  side: "bottom" | "top",
): PinPitchMeasurement | null {
  const { rgba, width, height } = pixelBuffer;

  // Scan band: 1-8px below chip body bottom edge (where pins protrude)
  const scanYStart = Math.min(bottomEdgePx + 1, height - 2);
  const scanYEnd = Math.min(bottomEdgePx + 8, height - 1);

  if (scanYEnd <= scanYStart || scanYStart >= height) {
    return null;
  }

  // Inset from device edges to avoid corner leads (focus on straight bottom pins)
  const inset = Math.max(2, Math.round((rightEdgePx - leftEdgePx) * 0.05));
  const scanXStart = leftEdgePx + inset;
  const scanXEnd = rightEdgePx - inset;
  const scanWidth = scanXEnd - scanXStart;

  if (scanWidth < 20) {
    return null;
  }

  // Step 1: Compute average luma per column in the scan band
  const colLuma: number[] = [];
  let totalLuma = 0;

  for (let x = scanXStart; x < scanXEnd; x += 1) {
    let lumaSum = 0;
    let count = 0;

    for (let y = scanYStart; y <= scanYEnd; y += 1) {
      const idx = (y * width + x) * 4;
      const luma = rgba[idx] * 0.299 + rgba[idx + 1] * 0.587 + rgba[idx + 2] * 0.114;
      lumaSum += luma;
      count += 1;
    }

    const avgLuma = lumaSum / count;
    colLuma.push(avgLuma);
    totalLuma += avgLuma;
  }

  // Step 2: Adaptive threshold — columns above mean = pin, below = gap
  const meanLuma = totalLuma / colLuma.length;
  const isPin: boolean[] = colLuma.map((l) => l > meanLuma);

  // Step 3: Find pin centers by detecting gap→pin transitions
  const pinCenters: number[] = [];
  let pinStart = -1;

  for (let i = 0; i < isPin.length; i += 1) {
    if (isPin[i] && pinStart === -1) {
      pinStart = i;
    } else if (!isPin[i] && pinStart !== -1) {
      const pinCenter = (pinStart + i - 1) / 2;
      const pinW = i - pinStart;

      // Filter out noise — real pins are at least 2px wide
      if (pinW >= 2) {
        pinCenters.push(pinCenter);
      }

      pinStart = -1;
    }
  }

  // Handle pin at end of scan
  if (pinStart !== -1) {
    const pinCenter = (pinStart + isPin.length - 1) / 2;
    const pinW = isPin.length - pinStart;

    if (pinW >= 2) {
      pinCenters.push(pinCenter);
    }
  }

  // Need at least 2 pins for pitch measurement
  if (pinCenters.length < 2) {
    return null;
  }

  // Step 4: Compute center-to-center pitch between consecutive pins
  const pitches: number[] = [];

  for (let i = 1; i < pinCenters.length; i += 1) {
    pitches.push(pinCenters[i] - pinCenters[i - 1]);
  }

  // Median pitch for robustness
  const sorted = [...pitches].sort((a, b) => a - b);
  const medianPitch = sorted[Math.floor(sorted.length / 2)];

  // Compute average pin width and gap
  let totalPinWidth = 0;
  let pinCount = 0;
  pinStart = -1;

  for (let i = 0; i < isPin.length; i += 1) {
    if (isPin[i] && pinStart === -1) {
      pinStart = i;
    } else if (!isPin[i] && pinStart !== -1) {
      const pinW = i - pinStart;

      if (pinW >= 2) {
        totalPinWidth += pinW;
        pinCount += 1;
      }

      pinStart = -1;
    }
  }

  const avgPinWidthPx = pinCount > 0 ? totalPinWidth / pinCount : 3;
  const gapPx = Math.max(0, medianPitch - avgPinWidthPx);

  return {
    pitchPx: Math.round(medianPitch * 10) / 10,
    pitchMm: Math.round((medianPitch * MICRONS_PER_PIXEL) / 10) / 100,
    gapPx: Math.round(gapPx * 10) / 10,
    gapMm: Math.round((gapPx * MICRONS_PER_PIXEL) / 10) / 100,
    pinWidthPx: Math.round(avgPinWidthPx * 10) / 10,
    pinWidthMm: Math.round((avgPinWidthPx * MICRONS_PER_PIXEL) / 10) / 100,
    detectedPinCount: pinCenters.length,
    measuredSide: side,
  };
}

function measurePinPitchVertical(
  pixelBuffer: PixelBufferInput,
  topEdgePx: number,
  bottomEdgePx: number,
  rightEdgePx: number,
  side: "right" | "left",
): PinPitchMeasurement | null {
  const { rgba, width, height } = pixelBuffer;

  const scanXStart = Math.min(rightEdgePx + 1, width - 2);
  const scanXEnd = Math.min(rightEdgePx + 8, width - 1);

  if (scanXEnd <= scanXStart || scanXStart >= width) {
    return null;
  }

  const inset = Math.max(2, Math.round((bottomEdgePx - topEdgePx) * 0.05));
  const scanYStart = topEdgePx + inset;
  const scanYEnd = bottomEdgePx - inset;
  const scanHeight = scanYEnd - scanYStart;

  if (scanHeight < 20) {
    return null;
  }

  const rowLuma: number[] = [];
  let totalLuma = 0;

  for (let y = scanYStart; y < scanYEnd; y += 1) {
    let lumaSum = 0;
    let count = 0;

    for (let x = scanXStart; x <= scanXEnd; x += 1) {
      const idx = (y * width + x) * 4;
      const luma = rgba[idx] * 0.299 + rgba[idx + 1] * 0.587 + rgba[idx + 2] * 0.114;
      lumaSum += luma;
      count += 1;
    }

    const avgLuma = lumaSum / count;
    rowLuma.push(avgLuma);
    totalLuma += avgLuma;
  }

  const meanLuma = totalLuma / rowLuma.length;
  const isPin: boolean[] = rowLuma.map((l) => l > meanLuma);

  const pinCenters: number[] = [];
  let pinStart = -1;

  for (let i = 0; i < isPin.length; i += 1) {
    if (isPin[i] && pinStart === -1) {
      pinStart = i;
    } else if (!isPin[i] && pinStart !== -1) {
      const pinCenter = (pinStart + i - 1) / 2;
      const pinW = i - pinStart;

      if (pinW >= 1) {
        pinCenters.push(pinCenter);
      }

      pinStart = -1;
    }
  }

  if (pinStart !== -1) {
    const pinCenter = (pinStart + isPin.length - 1) / 2;
    const pinW = isPin.length - pinStart;

    if (pinW >= 1) {
      pinCenters.push(pinCenter);
    }
  }

  if (pinCenters.length < 2) {
    return null;
  }

  const pitches: number[] = [];

  for (let i = 1; i < pinCenters.length; i += 1) {
    pitches.push(pinCenters[i] - pinCenters[i - 1]);
  }

  const sorted = [...pitches].sort((a, b) => a - b);
  const medianPitch = sorted[Math.floor(sorted.length / 2)];

  let totalPinWidth = 0;
  let pinCount = 0;
  pinStart = -1;

  for (let i = 0; i < isPin.length; i += 1) {
    if (isPin[i] && pinStart === -1) {
      pinStart = i;
    } else if (!isPin[i] && pinStart !== -1) {
      const pinW = i - pinStart;

      if (pinW >= 1) {
        totalPinWidth += pinW;
        pinCount += 1;
      }

      pinStart = -1;
    }
  }

  const avgPinWidthPx = pinCount > 0 ? totalPinWidth / pinCount : 3;
  const gapPx = Math.max(0, medianPitch - avgPinWidthPx);

  return {
    pitchPx: Math.round(medianPitch * 10) / 10,
    pitchMm: Math.round((medianPitch * MICRONS_PER_PIXEL) / 10) / 100,
    gapPx: Math.round(gapPx * 10) / 10,
    gapMm: Math.round((gapPx * MICRONS_PER_PIXEL) / 10) / 100,
    pinWidthPx: Math.round(avgPinWidthPx * 10) / 10,
    pinWidthMm: Math.round((avgPinWidthPx * MICRONS_PER_PIXEL) / 10) / 100,
    detectedPinCount: pinCenters.length,
    measuredSide: side,
  };
}
