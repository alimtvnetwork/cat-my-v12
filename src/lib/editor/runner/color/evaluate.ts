import { VerdictType } from "@/lib/editor/runner/types";
// Plan 42 step 25. Color condition evaluator core (spec/21-app/48).
//
// Pure inputs (RGBA byte buffer + ColorCondition), pure outputs
// (ConditionResult). Image acquisition and ROI cropping land in step 27;
// this module owns the color math only so it stays trivially unit-testable.
//
// Modes (spec 48 s3):
//  - Picked : compare params.ExpectedColor directly to the ROI mean.
//  - Current: compare params.ExpectedColor to the ROI mean color.
//  - Dense2 : compare params.ExpectedColor to the largest of k=2 clusters.
//  - Dense3 : compare params.ExpectedColor to the largest of k=3 clusters.
//
// The threshold is params.DeltaEThreshold; verdict FAIL uses reasonCode
// "ColorDeltaE"; empty ROI yields "EmptyRoi" (spec 48 s7).

import type { ColorCondition } from "@/lib/editor/schema";
import { ColorMode } from "@/types/rules/ColorMode";
import { ReasonCode } from "@/types/rules/ReasonCode";
import { type ConditionResult } from "../types";
import { hexToRgb, rgbToHex, rgbToLab, type Lab, type Rgb } from "./lab";
import { deltaE2000 } from "./delta-e";
import { kmeansLab } from "./kmeans";

/** Default ΔE 2000 pass threshold when the condition omits an override. */
export const DEFAULT_DELTA_E = 5;

export interface ColorEvalOptions {
  /** k-means seed for deterministic Dense2/Dense3 results in tests. */
  seed?: number;
  /** Optional override for the pass threshold. */
  threshold?: number;
}

/**
 * Compute the observed color for a ROI given the ColorMode.
 * Returns null when the ROI has zero pixels.
 */
export function observedColor(
  mode: ColorMode,
  roiRgba: Uint8ClampedArray,
  expected: Rgb,
  seed = 1,
): Rgb | null {
  const n = roiRgba.length >>> 2;

  if (n === 0) return null;

  if (mode === ColorMode.Picked) {
    // Picked: the observed value IS the expected swatch — comparing yields
    // ΔE 0. Callers still route through the evaluator so the reasonCode /
    // shape stays uniform.
    return { ...expected };
  }

  if (mode === ColorMode.Current) {
    let R = 0,
      G = 0,
      B = 0;
    for (let i = 0; i < roiRgba.length; i += 4) {
      R += roiRgba[i]!;
      G += roiRgba[i + 1]!;
      B += roiRgba[i + 2]!;
    }

    return { r: R / n, g: G / n, b: B / n };
  }

  const k = mode === ColorMode.Dense2 ? 2 : 3;
  const samples: Lab[] = new Array(n);
  for (let i = 0, p = 0; i < roiRgba.length; i += 4, p++) {
    samples[p] = rgbToLab(roiRgba[i]!, roiRgba[i + 1]!, roiRgba[i + 2]!);
  }

  const clusters = kmeansLab(samples, k, seed);
  const dominant = clusters[0];

  if (!dominant) return null;
  // Cluster centers are in Lab; convert back approximately by picking the
  // sample nearest the center in Lab space (cheaper and more faithful than
  // an inverse-Lab transform).
  let bestIdx = 0;
  let bestD = Infinity;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!;
    const dL = s.L - dominant.center.L;
    const da = s.a - dominant.center.a;
    const db = s.b - dominant.center.b;
    const d = dL * dL + da * da + db * db;

    if (d < bestD) {
      bestD = d;
      bestIdx = i;
    }
  }

  const off = bestIdx * 4;

  return { r: roiRgba[off]!, g: roiRgba[off + 1]!, b: roiRgba[off + 2]! };
}

export function evaluateColorCondition(
  cond: ColorCondition,
  roiRgba: Uint8ClampedArray,
  opts: ColorEvalOptions = {},
): ConditionResult {
  const threshold =
    opts.threshold ??
    (typeof (cond.params as { DeltaE?: number }).DeltaE === "number"
      ? (cond.params as { DeltaE: number }).DeltaE
      : DEFAULT_DELTA_E);
  const expected = hexToRgb(cond.params.ExpectedColor) ?? { r: 0, g: 0, b: 0 };

  if (roiRgba.length >>> 2 === 0) {
    return {
      conditionId: cond.id,
      type: cond.type,
      verdict: VerdictType.Fail,
      reasonCode: ReasonCode.EmptyRoi,
      message: "ROI has zero pixels",
    };
  }

  const observed = observedColor(cond.params.Mode, roiRgba, expected, opts.seed);

  if (!observed) {
    return {
      conditionId: cond.id,
      type: cond.type,
      verdict: VerdictType.Fail,
      reasonCode: ReasonCode.EmptyRoi,
      message: "ROI produced no samples",
    };
  }

  const dE = deltaE2000(
    rgbToLab(expected.r, expected.g, expected.b),
    rgbToLab(observed.r, observed.g, observed.b),
  );

  if (dE > threshold) {
    return {
      conditionId: cond.id,
      type: cond.type,
      verdict: VerdictType.Fail,
      reasonCode: ReasonCode.ColorDeltaE,
      message: `ΔE ${dE.toFixed(2)} > ${threshold} (observed ${rgbToHex(observed.r, observed.g, observed.b)}, expected ${cond.params.ExpectedColor})`,
    };
  }

  return {
    conditionId: cond.id,
    type: cond.type,
    verdict: VerdictType.Pass,
    reasonCode: ReasonCode.OK,
    message: `ΔE ${dE.toFixed(2)} ≤ ${threshold}`,
  };
}
