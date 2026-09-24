export type CarrierTapeVariation =
  | "empty-device-device"
  | "device-device-empty"
  | "device-empty-device";

export type PocketOccupancy = "empty" | "device";

export type Pin1Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type ChipModelType = "atmel";

export interface PocketDef {
  pocketIndex: number; // 0, 1, 2
  x: number;
  y: number;
  width: number;
  height: number;
  occupancy: PocketOccupancy;
  rotationDeg: number;
  chipModel: ChipModelType;
  hasPin1Dot: boolean;
  pin1Corner: Pin1Corner;
  hasLaserDefect: boolean;
}

export interface Rule1Pin1Result {
  isPass: boolean;
  hasPin1Found: boolean;
  offsetPx: number;
  angleDeg: number;
  tolerancePx: number;
  angleToleranceDeg: number;
  failureReason?: string;
  detectedX?: number;
  detectedY?: number;
  nominalX?: number;
  nominalY?: number;
}

export interface Rule2BoxItem {
  boxNumber: number;
  label: string;
  relX: number;
  relY: number;
  width: number;
  height: number;
  isMatched: boolean;
  measuredLuma?: number;
}

export interface Rule2PatternResult {
  isPass: boolean;
  isSkipped: boolean;
  score: number;
  matchedCount: number;
  totalCount: number;
  minMatchPercent: number;
  failureReason?: string;
  boxResults?: Rule2BoxItem[];
}

export interface PixelBufferInput {
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
}

/**
 * Real edge-detected device measurement from actual pixel data.
 * Uses horizontal/vertical gradient scans to locate chip boundaries.
 */
export interface PinPitchMeasurement {
  pitchPx: number;
  pitchMm: number;
  gapPx: number;
  gapMm: number;
  pinWidthPx: number;
  pinWidthMm: number;
  detectedPinCount: number;
  measuredSide: "bottom" | "left" | "right" | "top";
}

export interface DeviceMeasurement {
  widthPx: number;
  heightPx: number;
  widthMm: number;
  heightMm: number;
  leftEdgePx: number;
  rightEdgePx: number;
  topEdgePx: number;
  bottomEdgePx: number;
  micronsPerPixel: number;
  pinPitch?: PinPitchMeasurement | null;
}

export interface PocketInspectionResult {
  pocketIndex: number;
  occupancy: PocketOccupancy;
  verdict: "EMPTY" | "PASS" | "FAIL";
  failedRuleIndex: number | null;
  failedRuleName: string | null;
  failureReason: string | null;
  rule1Pin1: Rule1Pin1Result | null;
  rule2Pattern: Rule2PatternResult | null;
  isRule2Skipped: boolean;
  isRealPixelAnalysis?: boolean;
  deviceMeasurement?: DeviceMeasurement | null;
}

export interface CarrierTapeFrame {
  frameNumber: number; // 1 to 15
  variation: CarrierTapeVariation;
  lightingMultiplier: number;
  description: string;
  pockets: [PocketDef, PocketDef, PocketDef];
  results: [PocketInspectionResult, PocketInspectionResult, PocketInspectionResult];
}

export interface MultiRuleToleranceParams {
  marginTolerancePx: number;
  angleToleranceDeg: number;
  minMatchPercent: number;
  greyscaleLevel: number;
}

export interface CarrierTapeSimulationStats {
  totalFrames: number;
  inspectedFrames: number;
  totalPockets: number;
  emptyPockets: number;
  devicePockets: number;
  passedPockets: number;
  failedPockets: number;
  rule1FailedPockets: number;
  rule2FailedPockets: number;
  rule2SkippedCount: number;
  yieldPercent: number;
}
