import type { WorkpieceImageData } from "./workpiece-rule-analyzer";

export interface CarrierTapePocket {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isEmpty: boolean;
  presenceConfidence: number;
  /**
   * Spec section 8, Guard 1 statistics for this pocket, computed over the
   * full pocket box (the embossed cavity). `isEmpty` is decided from these
   * two values alone (see evaluatePocketPresence); the lead/edge fields
   * below are diagnostics only and never override the spec formula.
   */
  bodyMeanLuma?: number;
  bodySigmaLuma?: number;
  /** Diagnostic only: periodic lead-row rising edges (see evaluatePocketPresence). */
  leadTransitions?: number;
  /** Diagnostic only: fraction of body-zone pixels with gradient >= 32. */
  edgeDensity?: number;
  /** Diagnostic only: lead-zone pixels with luma > 105. */
  highLeadPixels?: number;
  /** Diagnostic only: brightest lead-zone luma observed (either lead row). */
  leadMaxLuma?: number;
  bodyRegion: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  markingRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  leadsTopRegion: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  leadsBottomRegion: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Options for segmentCarrierTapePockets. All fields are optional so the
 * existing single-argument call shape keeps working unchanged.
 */
export interface SegmentCarrierTapeOptions {
  /**
   * Millimetres per pixel for the sprocket-pitch conversion. The segmenter
   * previously had no umPerPixel / px-to-mm parameter of its own, so this
   * is the new, explicitly named conversion. Default 0.025 mm/px (25 um/px).
   * A wrong scale here scales sprocketHolePitchMm and the slip flag with
   * it, so callers with a calibrated scale should pass it explicitly.
   */
  mmPerPixel?: number;
  /**
   * EIA-481 nominal sprocket-hole pitch. Spec section 8, Guard 2: 4.00 mm.
   */
  sprocketNominalMm?: number;
  /**
   * Implementation default only — the spec names the 4.00 mm nominal but
   * no slip tolerance. |measured - nominal| above this is flagged as slip.
   * Default 0.20 mm (5% of nominal); callers may override it.
   */
  sprocketSlipToleranceMm?: number;
}

/** Default px-to-mm scale used when SegmentCarrierTapeOptions.mmPerPixel is absent. */
export const DEFAULT_MM_PER_PIXEL = 0.025;

/** Spec section 8, Guard 2 nominal sprocket-hole pitch (EIA-481). */
export const SPROCKET_NOMINAL_MM = 4.0;

/** Default slip/elongation tolerance in mm (implementation choice, not a spec value). */
export const DEFAULT_SPROCKET_SLIP_TOLERANCE_MM = 0.2;

export interface TapeSegmentationResult {
  totalPockets: number;
  emptyCount: number;
  filledCount: number;
  pockets: CarrierTapePocket[];
  /**
   * Spec section 8, Guard 2 measurement. All sprocket fields are absent
   * when no regular hole train was found in a margin strip — absence means
   * "not measured", never "pitch verified, no slip".
   */
  sprocketHolePitchPx?: number;
  /** Centre-to-centre sprocket pitch in mm: sprocketHolePitchPx * mmPerPixel. */
  sprocketHolePitchMm?: number;
  /** Number of hole centres in the accepted margin-strip hole train. */
  sprocketHoleCount?: number;
  /** sprocketHolePitchMm minus the EIA-481 nominal (negative = short/compressed). */
  sprocketPitchDeviationMm?: number;
  /** True when |sprocketPitchDeviationMm| exceeds the slip tolerance. */
  sprocketSlipDetected?: boolean;
  isMultiPocket: boolean;
}

interface PocketPresenceCheck {
  isEmpty: boolean;
  presenceConfidence: number;
  bodyMean: number;
  bodyStdDev: number;
  leadTransitions: number;
  edgeDensity: number;
  highLeadPixels: number;
  leadMaxLuma: number;
}

interface SprocketPitchMeasurement {
  pitchPx: number;
  pitchMm: number;
  holeCount: number;
  deviationMm: number;
  slipDetected: boolean;
}

export interface EvaluatePocketPresenceParams {
  imageData: WorkpieceImageData;
  pocket: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

function evaluatePocketPresence(
  imageData: WorkpieceImageData,
  pocket: { x: number; y: number; width: number; height: number },
): PocketPresenceCheck {
  const w = imageData.width;
  const h = imageData.height;

  // Lead zones: top row (5% to 25%) and bottom row (75% to 95%)
  const leadY1 = pocket.y + Math.floor(pocket.height * 0.05);
  const leadH1 = Math.floor(pocket.height * 0.22);
  const leadY2 = pocket.y + Math.floor(pocket.height * 0.73);
  const leadH2 = Math.floor(pocket.height * 0.22);

  const leadXStart = pocket.x + Math.floor(pocket.width * 0.12);
  const leadXEnd = pocket.x + Math.floor(pocket.width * 0.88);
  const leadSpan = Math.max(1, leadXEnd - leadXStart);

  let leadMaxLuma1 = 0;
  let leadMaxLuma2 = 0;
  let highLeadPixels = 0;

  // Track 1D horizontal luminance profiles in lead rows to evaluate pin periodicity
  const topLeadProfile = new Float64Array(leadSpan);
  const botLeadProfile = new Float64Array(leadSpan);

  for (let x = leadXStart; x < leadXEnd && x < w; x += 1) {
    const colIdx = x - leadXStart;
    let sumTop = 0;
    let sumBot = 0;

    for (let y = leadY1; y < leadY1 + leadH1 && y < h; y += 1) {
      const idx = (y * w + x) * 4;
      const luma =
        0.299 * imageData.rgba[idx] +
        0.587 * imageData.rgba[idx + 1] +
        0.114 * imageData.rgba[idx + 2];

      if (luma > leadMaxLuma1) {
        leadMaxLuma1 = luma;
      }

      if (luma > 105) {
        highLeadPixels += 1;
      }

      sumTop += luma;
    }

    for (let y = leadY2; y < leadY2 + leadH2 && y < h; y += 1) {
      const idx = (y * w + x) * 4;
      const luma =
        0.299 * imageData.rgba[idx] +
        0.587 * imageData.rgba[idx + 1] +
        0.114 * imageData.rgba[idx + 2];

      if (luma > leadMaxLuma2) {
        leadMaxLuma2 = luma;
      }

      if (luma > 105) {
        highLeadPixels += 1;
      }

      sumBot += luma;
    }

    topLeadProfile[colIdx] = sumTop / Math.max(1, leadH1);
    botLeadProfile[colIdx] = sumBot / Math.max(1, leadH2);
  }

  // Count discrete pin transitions (periodic rising edges) in lead rows
  let leadTransitions = 0;

  for (let c = 1; c < leadSpan - 1; c += 1) {
    const hasTopRise = topLeadProfile[c] > 90 && topLeadProfile[c] - topLeadProfile[c - 1] > 18;
    const hasBotRise = botLeadProfile[c] > 90 && botLeadProfile[c] - botLeadProfile[c - 1] > 18;

    if (hasTopRise) {
      leadTransitions += 1;
    }

    if (hasBotRise) {
      leadTransitions += 1;
    }
  }

  // Cavity zone for the spec Guard 1 statistics: the full pocket box.
  // The spec says "across the embossed cavity" and defines no central
  // sub-zone. A central body zone was tried first and misclassified a
  // filled pocket: a dark IC body measures mean ~50.5 there, below the
  // spec's 53 threshold, while the full pocket box measures 53.2 for
  // that filled pocket vs 49.9 for the empty pocket in the same image
  // (single filled sample: 74.8). Note the filled mixed sample passes
  // by only ~0.2 luma, so this guard remains fragile on dark bodies.
  const bodyY = pocket.y;
  const bodyH = pocket.height;
  const bodyXStart = pocket.x;
  const bodyXEnd = pocket.x + pocket.width;

  let bodySum = 0;
  let bodySumSq = 0;
  let bodyCount = 0;
  let highEdgePixels = 0;

  for (let y = bodyY; y < bodyY + bodyH && y < h; y += 1) {
    for (let x = bodyXStart; x < bodyXEnd && x < w; x += 1) {
      const idx = (y * w + x) * 4;
      const luma =
        0.299 * imageData.rgba[idx] +
        0.587 * imageData.rgba[idx + 1] +
        0.114 * imageData.rgba[idx + 2];

      bodySum += luma;
      bodySumSq += luma * luma;
      bodyCount += 1;

      // 2D discrete difference gradient for marking and chip edge density
      if (x > 0 && x < w - 1 && y > 0 && y < h - 1) {
        const rightIdx = (y * w + (x + 1)) * 4;
        const leftIdx = (y * w + (x - 1)) * 4;
        const downIdx = ((y + 1) * w + x) * 4;
        const upIdx = ((y - 1) * w + x) * 4;

        const rightLuma =
          0.299 * imageData.rgba[rightIdx] +
          0.587 * imageData.rgba[rightIdx + 1] +
          0.114 * imageData.rgba[rightIdx + 2];
        const leftLuma =
          0.299 * imageData.rgba[leftIdx] +
          0.587 * imageData.rgba[leftIdx + 1] +
          0.114 * imageData.rgba[leftIdx + 2];
        const downLuma =
          0.299 * imageData.rgba[downIdx] +
          0.587 * imageData.rgba[downIdx + 1] +
          0.114 * imageData.rgba[downIdx + 2];
        const upLuma =
          0.299 * imageData.rgba[upIdx] +
          0.587 * imageData.rgba[upIdx + 1] +
          0.114 * imageData.rgba[upIdx + 2];

        const grad = Math.abs(rightLuma - leftLuma) + Math.abs(downLuma - upLuma);

        if (grad >= 32) {
          highEdgePixels += 1;
        }
      }
    }
  }

  const bodyMean = bodyCount > 0 ? bodySum / bodyCount : 0;
  const variance = bodyCount > 0 ? Math.max(0, bodySumSq / bodyCount - bodyMean * bodyMean) : 0;
  const bodyStdDev = Math.sqrt(variance);
  const edgeDensity = bodyCount > 0 ? highEdgePixels / bodyCount : 0;

  // Spec section 8, Guard 1 — the pocket emptiness test. This is the ONLY
  // rule that sets isEmpty. bodyMean/bodyStdDev are computed above over
  // the full pocket box (the embossed cavity), per the spec's mean
  // (bar-L) and sigma-L:
  //   IsEmpty = (meanLuma < 53) OR (meanLuma < 58 AND sigmaLuma < 18.0)
  // The lead/edge evidence below is retained purely as diagnostics: a
  // pocket that looks "occupied" by leads/edges but satisfies the formula
  // above is still reported empty, and vice versa.
  const isEmpty = bodyMean < 53 || (bodyMean < 58 && bodyStdDev < 18.0);

  // Diagnostic evidence (no longer decisive for isEmpty): lead periodicity
  // (>= 4 periodic transitions) previously combined with strong package
  // edges (edgeDensity >= 0.024, sigma >= 16.0) or lead reflections
  // (both lead rows > 115 with >= 140 bright lead pixels) to decide
  // occupancy. Those quantities are still exposed on the pocket; they
  // only no longer override the spec formula above.
  const hasLeadPeriodicity = leadTransitions >= 4;

  // presenceConfidence keeps its previous evidence-based scaling (low for
  // empty, high for filled) so its magnitude stays comparable; only the
  // flag it is attached to has changed to the spec formula. It is NOT a
  // confidence in the spec formula itself.
  let presenceConfidence = 1.0;

  if (isEmpty) {
    presenceConfidence = Math.max(0.0, Math.min(0.35, edgeDensity * 10));
  } else {
    presenceConfidence = Math.min(
      1.0,
      Math.max(0.7, (bodyStdDev / 32) * (hasLeadPeriodicity ? 1.0 : 0.85)),
    );
  }

  return {
    isEmpty,
    presenceConfidence,
    bodyMean,
    bodyStdDev,
    leadTransitions,
    edgeDensity,
    highLeadPixels,
    leadMaxLuma: Math.max(leadMaxLuma1, leadMaxLuma2),
  };
}

function lumaAt(imageData: WorkpieceImageData, x: number, y: number): number {
  const idx = (y * imageData.width + x) * 4;

  return (
    0.299 * imageData.rgba[idx] + 0.587 * imageData.rgba[idx + 1] + 0.114 * imageData.rgba[idx + 2]
  );
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

interface SprocketHoleRun {
  centreX: number;
  width: number;
}

/**
 * Extract one polarity's hole runs (dark dips or bright peaks) from a
 * 1D margin-strip luminance profile. A run is a maximal run of columns
 * beyond `threshold` from the strip baseline; its centre is the run
 * midpoint. Runs narrower than 3 px are treated as noise.
 */
function extractSprocketRuns(
  profile: number[],
  baseline: number,
  threshold: number,
  isDip: boolean,
): SprocketHoleRun[] {
  const runs: SprocketHoleRun[] = [];
  let runStart = -1;

  const isHoleColumn = (value: number): boolean =>
    isDip ? value < baseline - threshold : value > baseline + threshold;

  for (let x = 0; x <= profile.length; x += 1) {
    const inRun = x < profile.length && isHoleColumn(profile[x]);

    if (inRun && runStart < 0) {
      runStart = x;
    }

    if (!inRun && runStart >= 0) {
      const width = x - runStart;

      if (width >= 3) {
        runs.push({ centreX: runStart + (width - 1) / 2, width });
      }

      runStart = -1;
    }
  }

  return runs;
}

interface SprocketTrain {
  pitchPx: number;
  holeCount: number;
  inlierIntervalCount: number;
  intervalCv: number;
}

/**
 * Score a candidate hole train (centres sorted along the tape). Pitch is
 * the median of the inlier centre-to-centre intervals (intervals within
 * 25% of the median interval), which tolerates one missed or spurious
 * hole. Returns undefined when the train is not regular enough to be a
 * measurement: fewer than 2 holes, or (for 3+ holes) fewer than 2 inlier
 * intervals, or (for exactly 2 holes) hole widths differing by more than
 * 2x, which is the only regularity check a single interval allows.
 */
function scoreSprocketTrain(runs: SprocketHoleRun[]): SprocketTrain | undefined {
  if (runs.length < 2) {
    return undefined;
  }

  const centres = runs.map((run) => run.centreX);
  const intervals: number[] = [];

  for (let i = 1; i < centres.length; i += 1) {
    const interval = centres[i] - centres[i - 1];

    if (interval > 0) {
      intervals.push(interval);
    }
  }

  if (intervals.length === 0) {
    return undefined;
  }

  if (runs.length === 2) {
    const widthRatio =
      Math.max(runs[0].width, runs[1].width) / Math.max(1, Math.min(runs[0].width, runs[1].width));

    if (widthRatio > 2) {
      return undefined;
    }

    return {
      pitchPx: intervals[0],
      holeCount: 2,
      inlierIntervalCount: 1,
      intervalCv: 0,
    };
  }

  const medianInterval = median(intervals);
  const inliers = intervals.filter(
    (interval) => Math.abs(interval - medianInterval) <= 0.25 * medianInterval,
  );

  if (inliers.length < 2) {
    return undefined;
  }

  const inlierMean = inliers.reduce((sum, value) => sum + value, 0) / inliers.length;
  const inlierVariance =
    inliers.reduce((sum, value) => sum + (value - inlierMean) * (value - inlierMean), 0) /
    inliers.length;
  const intervalCv = inlierMean > 0 ? Math.sqrt(inlierVariance) / inlierMean : 0;

  return {
    pitchPx: median(inliers),
    holeCount: centres.length,
    inlierIntervalCount: inliers.length,
    intervalCv,
  };
}

/**
 * Best-effort sprocket-hole detection in one horizontal margin strip
 * (rows yStart..yEnd, averaged per column). Holes may read dark or
 * bright depending on lighting/backlight, so dip and peak trains are
 * scored separately and the more regular train wins. Returns undefined
 * when no regular train is found — that is the honest outcome for a
 * strip with no visible sprocket row, not a zero pitch.
 */
function detectSprocketPitchInStrip(
  imageData: WorkpieceImageData,
  yStart: number,
  yEnd: number,
): SprocketTrain | undefined {
  const w = imageData.width;
  const stripHeight = yEnd - yStart;

  if (w < 10 || stripHeight < 3) {
    return undefined;
  }

  const rawProfile = new Float64Array(w);

  for (let x = 0; x < w; x += 1) {
    let sum = 0;

    for (let y = yStart; y < yEnd; y += 1) {
      sum += lumaAt(imageData, x, y);
    }

    rawProfile[x] = sum / stripHeight;
  }

  // 3-wide moving average to suppress single-column noise.
  const profile: number[] = [];

  for (let x = 0; x < w; x += 1) {
    const left = rawProfile[Math.max(0, x - 1)];
    const right = rawProfile[Math.min(w - 1, x + 1)];

    profile.push((left + rawProfile[x] + right) / 3);
  }

  const baseline = median(profile);
  const mad = median(profile.map((value) => Math.abs(value - baseline)));
  const threshold = Math.max(15, 4 * 1.4826 * mad);

  const dipTrain = scoreSprocketTrain(extractSprocketRuns(profile, baseline, threshold, true));
  const peakTrain = scoreSprocketTrain(extractSprocketRuns(profile, baseline, threshold, false));
  const candidates = [dipTrain, peakTrain].filter(
    (train): train is SprocketTrain => train !== undefined,
  );

  if (candidates.length === 0) {
    return undefined;
  }

  // Prefer the train with more inlier intervals, then the more regular one.
  candidates.sort(
    (a, b) => b.inlierIntervalCount - a.inlierIntervalCount || a.intervalCv - b.intervalCv,
  );

  return candidates[0];
}

/**
 * Measure the sprocket pitch over the given margin strips (each a
 * [yStart, yEnd) row range). Strips are tried independently and the best
 * train wins (most inlier intervals, then lowest interval CV), so a
 * sprocket row on either tape edge is found and a blank edge cannot
 * veto a real row on the other edge. Returns undefined when no strip
 * yields a regular hole train.
 */
function measureSprocketPitch(
  imageData: WorkpieceImageData,
  strips: Array<{ yStart: number; yEnd: number }>,
  mmPerPixel: number,
  nominalMm: number,
  slipToleranceMm: number,
): SprocketPitchMeasurement | undefined {
  let best: SprocketTrain | undefined;

  for (const strip of strips) {
    const train = detectSprocketPitchInStrip(imageData, strip.yStart, strip.yEnd);

    if (!train) {
      continue;
    }

    if (
      !best ||
      train.inlierIntervalCount > best.inlierIntervalCount ||
      (train.inlierIntervalCount === best.inlierIntervalCount && train.intervalCv < best.intervalCv)
    ) {
      best = train;
    }
  }

  if (!best) {
    return undefined;
  }

  const pitchMm = best.pitchPx * mmPerPixel;
  const deviationMm = pitchMm - nominalMm;

  return {
    pitchPx: best.pitchPx,
    pitchMm,
    holeCount: best.holeCount,
    deviationMm,
    slipDetected: Math.abs(deviationMm) > slipToleranceMm,
  };
}

function sprocketResultFields(
  measurement: SprocketPitchMeasurement | undefined,
): Pick<
  TapeSegmentationResult,
  | "sprocketHolePitchPx"
  | "sprocketHolePitchMm"
  | "sprocketHoleCount"
  | "sprocketPitchDeviationMm"
  | "sprocketSlipDetected"
> {
  if (!measurement) {
    return {};
  }

  return {
    sprocketHolePitchPx: measurement.pitchPx,
    sprocketHolePitchMm: measurement.pitchMm,
    sprocketHoleCount: measurement.holeCount,
    sprocketPitchDeviationMm: measurement.deviationMm,
    sprocketSlipDetected: measurement.slipDetected,
  };
}

export function segmentCarrierTapePockets(
  imageData: WorkpieceImageData,
  options?: SegmentCarrierTapeOptions,
): TapeSegmentationResult {
  const w = imageData.width;
  const h = imageData.height;

  if (w <= 0 || h <= 0) {
    return {
      totalPockets: 0,
      emptyCount: 0,
      filledCount: 0,
      pockets: [],
      isMultiPocket: false,
    };
  }

  // Resolve the sprocket conversion once; every field below uses it, so a
  // caller-supplied scale and the default can never disagree mid-result.
  const mmPerPixel =
    options?.mmPerPixel !== undefined &&
    Number.isFinite(options.mmPerPixel) &&
    options.mmPerPixel > 0
      ? options.mmPerPixel
      : DEFAULT_MM_PER_PIXEL;
  const sprocketNominalMm =
    options?.sprocketNominalMm !== undefined &&
    Number.isFinite(options.sprocketNominalMm) &&
    options.sprocketNominalMm > 0
      ? options.sprocketNominalMm
      : SPROCKET_NOMINAL_MM;
  const sprocketSlipToleranceMm =
    options?.sprocketSlipToleranceMm !== undefined &&
    Number.isFinite(options.sprocketSlipToleranceMm) &&
    options.sprocketSlipToleranceMm >= 0
      ? options.sprocketSlipToleranceMm
      : DEFAULT_SPROCKET_SLIP_TOLERANCE_MM;

  const aspect = w / h;

  // Single-pocket cropped image check (e.g. 247x404 with aspect < 0.90)
  if (aspect < 0.92) {
    const presence = evaluatePocketPresence(imageData, { x: 0, y: 0, width: w, height: h });
    const singlePocket: CarrierTapePocket = {
      index: 1,
      x: 0,
      y: 0,
      width: w,
      height: h,
      isEmpty: presence.isEmpty,
      presenceConfidence: presence.presenceConfidence,
      bodyMeanLuma: presence.bodyMean,
      bodySigmaLuma: presence.bodyStdDev,
      leadTransitions: presence.leadTransitions,
      edgeDensity: presence.edgeDensity,
      highLeadPixels: presence.highLeadPixels,
      leadMaxLuma: presence.leadMaxLuma,
      bodyRegion: {
        x: Math.round(w * 0.18),
        y: Math.round(h * 0.28),
        width: Math.round(w * 0.64),
        height: Math.round(h * 0.44),
      },
      markingRegion: {
        x: Math.round(w * 0.25),
        y: Math.round(h * 0.3),
        width: Math.round(w * 0.5),
        height: Math.round(h * 0.38),
      },
      leadsTopRegion: {
        x: Math.round(w * 0.15),
        y: Math.round(h * 0.08),
        width: Math.round(w * 0.7),
        height: Math.round(h * 0.2),
      },
      leadsBottomRegion: {
        x: Math.round(w * 0.15),
        y: Math.round(h * 0.72),
        width: Math.round(w * 0.7),
        height: Math.round(h * 0.2),
      },
    };

    // ASSUMPTION/LIMITATION: a full-frame single-pocket crop has no tape
    // margin in the image (the pocket fills the frame), so there is no
    // true sprocket row to measure. As a best-effort fallback only, the
    // top 8% strip is scanned; the regularity gates in scoreSprocketTrain
    // mean this normally yields no measurement rather than a spurious
    // pitch. A measured value here must not be read as a verified
    // EIA-481 margin measurement — use a tape-strip image for that.
    const singleSprocket = measureSprocketPitch(
      imageData,
      [{ yStart: 0, yEnd: Math.max(3, Math.floor(h * 0.08)) }],
      mmPerPixel,
      sprocketNominalMm,
      sprocketSlipToleranceMm,
    );

    return {
      totalPockets: 1,
      emptyCount: presence.isEmpty ? 1 : 0,
      filledCount: presence.isEmpty ? 0 : 1,
      pockets: [singlePocket],
      ...sprocketResultFields(singleSprocket),
      isMultiPocket: false,
    };
  }

  // 1. Measure horizontal column luminance profile across the central pocket belt
  const midYStart = Math.floor(h * 0.25);
  const midYEnd = Math.floor(h * 0.75);
  const colLuma = new Float64Array(w);

  for (let x = 0; x < w; x += 1) {
    let sum = 0;

    for (let y = midYStart; y < midYEnd; y += 1) {
      const idx = (y * w + x) * 4;
      sum +=
        0.299 * imageData.rgba[idx] +
        0.587 * imageData.rgba[idx + 1] +
        0.114 * imageData.rgba[idx + 2];
    }

    colLuma[x] = sum / (midYEnd - midYStart);
  }

  // 2. Identify vertical divider rib peaks (bright vertical reflections, luma > 75)
  const rawPeaks: number[] = [];

  for (let x = 15; x < w - 15; x += 1) {
    if (colLuma[x] > 70 && colLuma[x] > colLuma[x - 1] && colLuma[x] > colLuma[x + 1]) {
      let isMax = true;

      for (let dx = -16; dx <= 16; dx += 1) {
        if (colLuma[x + dx] > colLuma[x]) {
          isMax = false;
          break;
        }
      }

      if (isMax) {
        rawPeaks.push(x);
      }
    }
  }

  // Cluster nearby peaks (< 60px apart)
  const clusteredPeaks: number[] = [];

  for (const p of rawPeaks) {
    if (clusteredPeaks.length === 0) {
      clusteredPeaks.push(p);
    } else {
      const last = clusteredPeaks[clusteredPeaks.length - 1];

      if (p - last < 60) {
        clusteredPeaks[clusteredPeaks.length - 1] = Math.round((last + p) / 2);
      } else {
        clusteredPeaks.push(p);
      }
    }
  }

  // 3. Build pocket boundaries
  let boundaries: number[] = [];

  if (clusteredPeaks.length >= 2) {
    // Strip of multiple pockets
    boundaries = [0, ...clusteredPeaks, w];
  } else if (clusteredPeaks.length === 1 && aspect >= 1.0) {
    // 2-pocket strip (e.g. pocket-2-empty-mixed)
    boundaries = [0, clusteredPeaks[0], w];
  } else {
    // Single pocket
    boundaries = [0, w];
  }

  // Clean boundaries to enforce minimum pocket width (e.g. >= 110px)
  const cleanBoundaries: number[] = [boundaries[0]];

  for (let i = 1; i < boundaries.length; i += 1) {
    const cur = boundaries[i];
    const prev = cleanBoundaries[cleanBoundaries.length - 1];

    if (cur - prev >= 110) {
      cleanBoundaries.push(cur);
    } else if (i === boundaries.length - 1 && cleanBoundaries.length > 1) {
      cleanBoundaries[cleanBoundaries.length - 1] = cur;
    }
  }

  const pockets: CarrierTapePocket[] = [];
  const pocketTop = Math.floor(h * 0.12);
  const pocketHeight = Math.floor(h * 0.8);

  for (let i = 0; i < cleanBoundaries.length - 1; i += 1) {
    const px = cleanBoundaries[i];
    const pw = cleanBoundaries[i + 1] - px;

    if (pw < 100) {
      continue;
    }

    const pocketBox = {
      x: px,
      y: pocketTop,
      width: pw,
      height: pocketHeight,
    };

    const presence = evaluatePocketPresence(imageData, pocketBox);

    const pocketItem: CarrierTapePocket = {
      index: pockets.length + 1,
      x: px,
      y: pocketTop,
      width: pw,
      height: pocketHeight,
      isEmpty: presence.isEmpty,
      presenceConfidence: presence.presenceConfidence,
      bodyMeanLuma: presence.bodyMean,
      bodySigmaLuma: presence.bodyStdDev,
      leadTransitions: presence.leadTransitions,
      edgeDensity: presence.edgeDensity,
      highLeadPixels: presence.highLeadPixels,
      leadMaxLuma: presence.leadMaxLuma,
      bodyRegion: {
        x: px + Math.round(pw * 0.18),
        y: pocketTop + Math.round(pocketHeight * 0.4),
        width: Math.round(pw * 0.64),
        height: Math.round(pocketHeight * 0.38),
      },
      markingRegion: {
        x: px + Math.round(pw * 0.2),
        y: pocketTop + Math.round(pocketHeight * 0.45),
        width: Math.round(pw * 0.6),
        height: Math.round(pocketHeight * 0.28),
      },
      leadsTopRegion: {
        x: px + Math.round(pw * 0.12),
        y: pocketTop + Math.round(pocketHeight * 0.06),
        width: Math.round(pw * 0.76),
        height: Math.round(pocketHeight * 0.22),
      },
      leadsBottomRegion: {
        x: px + Math.round(pw * 0.12),
        y: pocketTop + Math.round(pocketHeight * 0.72),
        width: Math.round(pw * 0.76),
        height: Math.round(pocketHeight * 0.22),
      },
    };

    pockets.push(pocketItem);
  }

  const emptyCount = pockets.filter((p) => p.isEmpty).length;
  const filledCount = pockets.length - emptyCount;

  // Spec section 8, Guard 2: sprocket row lives in the tape margin
  // outside the pocket bodies — here, the strips above pocketTop
  // (top 12% of the image) and below pocketTop + pocketHeight (bottom
  // 8%). Both edges are tried; see measureSprocketPitch. This assumes
  // a horizontal tape (pockets laid out along x, sprocket row along a
  // top/bottom edge); a vertical tape or a crop with no margin row
  // yields no measurement (fields absent), not a fabricated pitch.
  const stripSprocket = measureSprocketPitch(
    imageData,
    [
      { yStart: 0, yEnd: pocketTop },
      { yStart: pocketTop + pocketHeight, yEnd: h },
    ],
    mmPerPixel,
    sprocketNominalMm,
    sprocketSlipToleranceMm,
  );

  return {
    totalPockets: pockets.length,
    emptyCount,
    filledCount,
    pockets,
    ...sprocketResultFields(stripSprocket),
    isMultiPocket: pockets.length > 1,
  };
}
