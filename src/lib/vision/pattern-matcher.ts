import {
  markWhiteBoxes,
  type GrayscaleMode,
  type MatchPolarity,
  type SearchRegion,
  type WhiteBoxMark,
} from "./white-box-marking";

export interface ReferenceBoxItem {
  boxNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  area?: number;
}

export interface ConstellationMatchParams {
  targetRgba: Uint8ClampedArray;
  targetWidth: number;
  targetHeight: number;
  referenceBoxes: readonly ReferenceBoxItem[];
  referencePatternBox?: { x: number; y: number; width: number; height: number };
  /**
   * Search region in TARGET-IMAGE space (spec 55 canonical space: the
   * stretched 960x540 canvas when the caller passes canvas images).
   * matchedX/matchedY are returned in this same space — no second
   * coordinate space is involved anywhere in this matcher.
   */
  searchRegion?: SearchRegion;
  threshold?: number;
  tolerancePx?: number;
  minMatchPercent?: number;
  /** Matching conversion mode (spec 55): fed to the shared
   *  toMatchingGray plane. Defaults to "threshold". */
  mode?: GrayscaleMode;
  /** Marking polarity (spec 55): "bright" is historical, "dark"
   *  matches dark-on-light markings, "both" unions both candidate
   *  sets. Defaults to "bright" (behavior-preserving). */
  polarity?: MatchPolarity;
  /**
   * Bounded rotation search window in degrees (spec T102 angleRangeDeg).
   * When absent or 0, only the unrotated constellation is tried.
   * Candidate angles are 0, ±5, ±10, ... up to this range, rotating the
   * expected box centres about the constellation centroid. The winner
   * is the highest matched count, then lowest distance, then smallest
   * |angle| — so a rotation only wins when it strictly improves the
   * match over the unrotated constellation.
   */
  angleRangeDeg?: number;
}

export interface BoxMatchItem {
  boxNumber: number;
  referenceX: number;
  referenceY: number;
  matchedX: number;
  matchedY: number;
  width: number;
  height: number;
  isMatched: boolean;
  /**
   * Positional evidence, independent of any luma verdict (spec 55):
   * true when a candidate box paired with this reference box, false
   * when matchedX/matchedY are fallback expected positions. Consumers
   * that AND positional and luma evidence (the workpiece analyzer)
   * read this, not isMatched, for the positional half.
   */
  isPositionMatched?: boolean;
  measuredLuma?: number;
  expectedLuma?: number;
  lumaDelta?: number;
}

export interface PatternMatchResult {
  isPass: boolean;
  score: number;
  matchedCount: number;
  totalCount: number;
  offsetX: number;
  offsetY: number;
  patternBounds: { x: number; y: number; width: number; height: number };
  boxResults: BoxMatchItem[];
  executionTimeMs: number;
  uniformScaleApplied?: boolean;
  constellationScale?: number;
  /** Rotation (deg) of the winning constellation, 0 when unrotated. Optional so other PatternMatchResult producers are unaffected. */
  rotationDeg?: number;
  /** Which reference the verdict compared against (spec 55): "taught"
   *  when the caller supplied taught boxes, "golden-fallback" when a
   *  hardcoded golden table stood in. Absent for matchers that do not
   *  distinguish (e.g. the constellation matcher, which always takes
   *  caller-supplied boxes). */
  matchSource?: "taught" | "golden-fallback";
}

interface OffsetCandidate {
  dx: number;
  dy: number;
  score: number;
  totalDistance: number;
}

function calculatePatternBounds(
  boxes: readonly ReferenceBoxItem[],
  dx: number,
  dy: number,
): { x: number; y: number; width: number; height: number } {
  if (boxes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const box of boxes) {
    minX = Math.min(minX, box.x + dx);
    minY = Math.min(minY, box.y + dy);
    maxX = Math.max(maxX, box.x + dx + box.width);
    maxY = Math.max(maxY, box.y + dy + box.height);
  }

  return {
    x: Math.max(0, minX),
    y: Math.max(0, minY),
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function findBestOffset(
  refBoxes: readonly ReferenceBoxItem[],
  candidateBoxes: readonly WhiteBoxMark[],
  tolerance: number,
): { dx: number; dy: number } {
  const testedOffsets = new Map<string, OffsetCandidate>();

  const registerOffset = (dx: number, dy: number) => {
    const key = `${dx},${dy}`;

    if (testedOffsets.has(key)) {
      return;
    }

    const pairs: Array<{ refIdx: number; candIdx: number; dist: number }> = [];

    for (let r = 0; r < refBoxes.length; r += 1) {
      const ref = refBoxes[r];
      const targetCenterX = ref.x + dx + ref.width / 2;
      const targetCenterY = ref.y + dy + ref.height / 2;

      for (let c = 0; c < candidateBoxes.length; c += 1) {
        const cand = candidateBoxes[c];
        const candCenterX = cand.x + cand.width / 2;
        const candCenterY = cand.y + cand.height / 2;
        const distX = Math.abs(candCenterX - targetCenterX);
        const distY = Math.abs(candCenterY - targetCenterY);

        if (distX <= tolerance && distY <= tolerance) {
          pairs.push({ refIdx: r, candIdx: c, dist: distX + distY });
        }
      }
    }

    pairs.sort((a, b) => a.dist - b.dist);
    const assignedRefs = new Set<number>();
    const assignedCands = new Set<number>();
    let matchCount = 0;
    let totalDistance = 0;

    for (const p of pairs) {
      if (!assignedRefs.has(p.refIdx) && !assignedCands.has(p.candIdx)) {
        assignedRefs.add(p.refIdx);
        assignedCands.add(p.candIdx);
        matchCount += 1;
        totalDistance += p.dist;
      }
    }

    totalDistance += (refBoxes.length - matchCount) * tolerance * 4;
    testedOffsets.set(key, { dx, dy, score: matchCount, totalDistance });
  };

  registerOffset(0, 0);

  for (const ref of refBoxes) {
    const refCenterX = ref.x + ref.width / 2;
    const refCenterY = ref.y + ref.height / 2;

    for (const cand of candidateBoxes) {
      const candCenterX = cand.x + cand.width / 2;
      const candCenterY = cand.y + cand.height / 2;
      const dx = Math.round(candCenterX - refCenterX);
      const dy = Math.round(candCenterY - refCenterY);
      registerOffset(dx, dy);
    }
  }

  let best: OffsetCandidate = {
    dx: 0,
    dy: 0,
    score: -1,
    totalDistance: Number.POSITIVE_INFINITY,
  };

  for (const candidate of testedOffsets.values()) {
    const hasHigherScore = candidate.score > best.score;
    const hasTiedScoreLowerDist =
      candidate.score === best.score && candidate.totalDistance < best.totalDistance;

    if (hasHigherScore || hasTiedScoreLowerDist) {
      best = candidate;
    }
  }

  return { dx: best.dx, dy: best.dy };
}

export function matchConstellationPattern(params: ConstellationMatchParams): PatternMatchResult {
  const startTime = performance.now();
  const tolerance = params.tolerancePx ?? 8;
  const minPercent = params.minMatchPercent ?? 100;
  const totalCount = params.referenceBoxes.length;

  if (totalCount === 0) {
    return {
      isPass: false,
      score: 0,
      matchedCount: 0,
      totalCount: 0,
      offsetX: 0,
      offsetY: 0,
      patternBounds: { x: 0, y: 0, width: 0, height: 0 },
      boxResults: [],
      executionTimeMs: 0,
    };
  }

  const isDefaultPlaceholder =
    params.searchRegion &&
    params.searchRegion.x === 10 &&
    params.searchRegion.y === 10 &&
    params.searchRegion.width === 200 &&
    params.searchRegion.height === 200;

  const targetRegion = isDefaultPlaceholder ? undefined : params.searchRegion;
  const rawThreshold = params.threshold ?? 170;
  const effectiveThreshold =
    rawThreshold >= 30 && rawThreshold <= 245 ? Math.round(rawThreshold) : 170;
  const minCandidateArea = 4;

  // Candidate detection per walk direction (spec 55 polarity). The
  // bounded-region fallback from the original flow is preserved per
  // direction, so a dark search is never starved by a bright miss.
  const detectCandidates = (direction: "bright" | "dark"): WhiteBoxMark[] => {
    let markingResult = markWhiteBoxes({
      width: params.targetWidth,
      height: params.targetHeight,
      rgba: params.targetRgba,
      whiteThreshold: effectiveThreshold,
      minAreaPx: minCandidateArea,
      searchRegion: targetRegion,
      mode: params.mode ?? "threshold",
      polarity: direction,
    });

    if (markingResult.boxes.length < totalCount && params.referenceBoxes.length > 0) {
      const refMinX = Math.min(...params.referenceBoxes.map((b) => b.x));
      const refMinY = Math.min(...params.referenceBoxes.map((b) => b.y));
      const refMaxX = Math.max(...params.referenceBoxes.map((b) => b.x + b.width));
      const refMaxY = Math.max(...params.referenceBoxes.map((b) => b.y + b.height));

      const boundedRegion: SearchRegion = {
        x: Math.max(0, refMinX - 8),
        y: Math.max(0, refMinY),
        width: Math.min(params.targetWidth - Math.max(0, refMinX - 8), refMaxX - refMinX + 16),
        height: Math.min(params.targetHeight - Math.max(0, refMinY), refMaxY - refMinY + 8),
      };

      const boundedResult = markWhiteBoxes({
        width: params.targetWidth,
        height: params.targetHeight,
        rgba: params.targetRgba,
        whiteThreshold: effectiveThreshold,
        minAreaPx: minCandidateArea,
        searchRegion: boundedRegion,
        mode: params.mode ?? "threshold",
        polarity: direction,
      });

      if (boundedResult.boxes.length > markingResult.boxes.length) {
        markingResult = boundedResult;
      }
    }

    return markingResult.boxes;
  };

  // Bounded rotation search: rotate expected box centres about the
  // constellation centroid by candidate angles within angleRangeDeg
  // (step 5 deg). For each rotation, find the best translation offset
  // and greedily pair candidates; keep the rotation with the highest
  // matched count, then lowest distance, then smallest |angle|.
  const angleRange = params.angleRangeDeg ?? 0;
  const candidateAngles: number[] = [0];

  if (Number.isFinite(angleRange) && angleRange > 0) {
    for (let a = 5; a <= angleRange; a += 5) {
      candidateAngles.push(a, -a);
    }
  }

  const centroidX =
    params.referenceBoxes.reduce((sum, b) => sum + b.x + b.width / 2, 0) /
    params.referenceBoxes.length;
  const centroidY =
    params.referenceBoxes.reduce((sum, b) => sum + b.y + b.height / 2, 0) /
    params.referenceBoxes.length;

  interface RotationCandidate {
    angleDeg: number;
    dx: number;
    dy: number;
    matched: Map<number, number>;
    matchedCount: number;
    totalDistance: number;
    rotatedBoxes: readonly ReferenceBoxItem[];
  }

  const runRotationSearch = (candidateBoxes: readonly WhiteBoxMark[]): RotationCandidate => {
    let bestRotation: RotationCandidate = {
      angleDeg: 0,
      dx: 0,
      dy: 0,
      matched: new Map<number, number>(),
      matchedCount: 0,
      totalDistance: Number.POSITIVE_INFINITY,
      rotatedBoxes: [...params.referenceBoxes],
    };

    for (const angleDeg of candidateAngles) {
      const rad = (angleDeg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const rotatedBoxes: ReferenceBoxItem[] = params.referenceBoxes.map((b) => {
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        const relX = cx - centroidX;
        const relY = cy - centroidY;
        const rotCx = centroidX + relX * cos - relY * sin;
        const rotCy = centroidY + relX * sin + relY * cos;

        return { ...b, x: rotCx - b.width / 2, y: rotCy - b.height / 2 };
      });

      const offset = findBestOffset(rotatedBoxes, candidateBoxes, tolerance);

      interface PairCandidate {
        refIndex: number;
        candIndex: number;
        dist: number;
      }

      const candidatePairs: PairCandidate[] = [];

      for (let r = 0; r < rotatedBoxes.length; r += 1) {
        const ref = rotatedBoxes[r];
        const expectedCenterX = ref.x + offset.dx + ref.width / 2;
        const expectedCenterY = ref.y + offset.dy + ref.height / 2;

        for (let c = 0; c < candidateBoxes.length; c += 1) {
          const cand = candidateBoxes[c];
          const candCenterX = cand.x + cand.width / 2;
          const candCenterY = cand.y + cand.height / 2;
          const distX = Math.abs(candCenterX - expectedCenterX);
          const distY = Math.abs(candCenterY - expectedCenterY);

          if (distX <= tolerance && distY <= tolerance) {
            candidatePairs.push({ refIndex: r, candIndex: c, dist: distX + distY });
          }
        }
      }

      candidatePairs.sort((a, b) => a.dist - b.dist);

      const matched = new Map<number, number>();
      const matchedCands = new Set<number>();
      let pairDistance = 0;

      for (const pair of candidatePairs) {
        if (!matched.has(pair.refIndex) && !matchedCands.has(pair.candIndex)) {
          matched.set(pair.refIndex, pair.candIndex);
          matchedCands.add(pair.candIndex);
          pairDistance += pair.dist;
        }
      }

      const totalDistance = pairDistance + (rotatedBoxes.length - matched.size) * tolerance * 4;
      const candidate: RotationCandidate = {
        angleDeg,
        dx: offset.dx,
        dy: offset.dy,
        matched,
        matchedCount: matched.size,
        totalDistance,
        rotatedBoxes,
      };

      if (
        candidate.matchedCount > bestRotation.matchedCount ||
        (candidate.matchedCount === bestRotation.matchedCount &&
          candidate.totalDistance < bestRotation.totalDistance) ||
        (candidate.matchedCount === bestRotation.matchedCount &&
          candidate.totalDistance === bestRotation.totalDistance &&
          Math.abs(candidate.angleDeg) < Math.abs(bestRotation.angleDeg))
      ) {
        bestRotation = candidate;
      }
    }

    return bestRotation;
  };

  // Polarity combination (spec 55): bright pairs first, so a dark blob
  // can never steal a bright mark's pairing; dark candidates only fill
  // references bright could not pair. When bright pairs nothing and
  // dark pairs something, the dark constellation wins wholesale (a
  // dark-marking rule, not a bright rule with noise).
  const requestedPolarity = params.polarity ?? "bright";
  let candidateBoxes: readonly WhiteBoxMark[];
  let bestRotation: RotationCandidate;

  if (requestedPolarity === "dark") {
    candidateBoxes = detectCandidates("dark");
    bestRotation = runRotationSearch(candidateBoxes);
  } else if (requestedPolarity === "both") {
    const brightCandidates = detectCandidates("bright");
    const darkCandidates = detectCandidates("dark");
    const brightBest = runRotationSearch(brightCandidates);
    const darkBest = runRotationSearch(darkCandidates);

    if (brightBest.matchedCount === 0 && darkBest.matchedCount > 0) {
      candidateBoxes = darkCandidates;
      bestRotation = darkBest;
    } else {
      const combined = [...brightCandidates, ...darkCandidates];
      const matched = new Map<number, number>(brightBest.matched);
      const usedDark = new Set<number>();

      for (let r = 0; r < params.referenceBoxes.length; r += 1) {
        if (matched.has(r)) {
          continue;
        }

        const ref = brightBest.rotatedBoxes[r];
        const expectedCenterX = ref.x + brightBest.dx + ref.width / 2;
        const expectedCenterY = ref.y + brightBest.dy + ref.height / 2;
        let bestIdx = -1;
        let bestDist = Number.POSITIVE_INFINITY;

        for (let c = 0; c < darkCandidates.length; c += 1) {
          if (usedDark.has(c)) {
            continue;
          }

          const cand = darkCandidates[c];
          const distX = Math.abs(cand.x + cand.width / 2 - expectedCenterX);
          const distY = Math.abs(cand.y + cand.height / 2 - expectedCenterY);

          if (distX <= tolerance && distY <= tolerance && distX + distY < bestDist) {
            bestDist = distX + distY;
            bestIdx = c;
          }
        }

        if (bestIdx >= 0) {
          matched.set(r, brightCandidates.length + bestIdx);
          usedDark.add(bestIdx);
        }
      }

      candidateBoxes = combined;
      bestRotation = { ...brightBest, matched, matchedCount: matched.size };
    }
  } else {
    candidateBoxes = detectCandidates("bright");
    bestRotation = runRotationSearch(candidateBoxes);
  }

  const bestOffset = { dx: bestRotation.dx, dy: bestRotation.dy };
  const matchedRefIndices = bestRotation.matched;
  const rotatedBoxes = bestRotation.rotatedBoxes;

  const boxResults: BoxMatchItem[] = [];

  for (let r = 0; r < params.referenceBoxes.length; r += 1) {
    const ref = params.referenceBoxes[r];
    const rotated = rotatedBoxes[r];
    const candIdx = matchedRefIndices.get(r);

    if (candIdx !== undefined) {
      const cand = candidateBoxes[candIdx];
      boxResults.push({
        boxNumber: ref.boxNumber,
        referenceX: ref.x,
        referenceY: ref.y,
        matchedX: cand.x,
        matchedY: cand.y,
        width: cand.width,
        height: cand.height,
        isMatched: true,
        isPositionMatched: true,
      });
    } else {
      boxResults.push({
        boxNumber: ref.boxNumber,
        referenceX: ref.x,
        referenceY: ref.y,
        matchedX: rotated.x + bestOffset.dx,
        matchedY: rotated.y + bestOffset.dy,
        width: ref.width,
        height: ref.height,
        isMatched: false,
        isPositionMatched: false,
      });
    }
  }

  const matchedCount = boxResults.filter((b) => b.isMatched).length;
  const score = Math.round((matchedCount / totalCount) * 100);
  const isPass = score >= minPercent;
  const patternBounds = calculatePatternBounds(params.referenceBoxes, bestOffset.dx, bestOffset.dy);
  const executionTimeMs = Math.round((performance.now() - startTime) * 10) / 10;

  return {
    isPass,
    score,
    matchedCount,
    totalCount,
    offsetX: bestOffset.dx,
    offsetY: bestOffset.dy,
    patternBounds,
    boxResults,
    executionTimeMs,
    rotationDeg: bestRotation?.angleDeg ?? 0,
  };
}

/**
 * Pocket-portability helpers (pure, dependency-free).
 *
 * A rule taught on one image/pocket must be usable on another pocket
 * (different position, possibly different size) without re-teaching.
 * These helpers are the coordinate layer for that: they convert
 * between absolute image coordinates and pocket-relative coordinates,
 * and adapt a stored reference to a target pocket. They do NOT run any
 * detection — the coordinator calls them when wiring a stored rule
 * (Pin1 registered position, pattern boxes) onto a target pocket.
 *
 * This block is mirrored in ./carrier-tape-segmenter.ts with identical
 * signatures so either import site works without a cross-dependency;
 * keep the two copies in sync if either changes.
 */

/** An axis-aligned box, e.g. a pocket box or a stored reference box. */
export interface PocketBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PocketPoint {
  x: number;
  y: number;
}

/**
 * Pocket-relative point as fractions of the pocket size: u = 0 at the
 * pocket's left edge, 1 at its right edge; v = 0 at the top, 1 at the
 * bottom. Fractions (not pixel offsets) are what make a taught
 * position portable to a differently sized pocket.
 */
export interface PocketRelativePoint {
  u: number;
  v: number;
}

/**
 * Absolute teach-image point -> pocket-relative fractions.
 * Translation+scale only: no rotation is applied or assumed. A point
 * outside the pocket yields u/v outside [0, 1], which is meaningful
 * (it records how far outside it was) rather than being clamped.
 */
export function absoluteToPocketRelative(
  point: PocketPoint,
  pocket: PocketBox,
): PocketRelativePoint {
  return {
    u: pocket.width !== 0 ? (point.x - pocket.x) / pocket.width : 0,
    v: pocket.height !== 0 ? (point.y - pocket.y) / pocket.height : 0,
  };
}

/** Pocket-relative fractions -> absolute point in the given pocket. Translation+scale only. */
export function pocketRelativeToAbsolute(
  relative: PocketRelativePoint,
  pocket: PocketBox,
): PocketPoint {
  return {
    x: pocket.x + relative.u * pocket.width,
    y: pocket.y + relative.v * pocket.height,
  };
}

/** Absolute point -> pixel offset from the pocket's top-left corner. Translation only (no scaling). */
export function absoluteToPocketOffset(point: PocketPoint, pocket: PocketBox): PocketPoint {
  return { x: point.x - pocket.x, y: point.y - pocket.y };
}

/** Pixel offset from a pocket's top-left corner -> absolute point. Translation only (no scaling). */
export function pocketOffsetToAbsolute(offset: PocketPoint, pocket: PocketBox): PocketPoint {
  return { x: pocket.x + offset.x, y: pocket.y + offset.y };
}

/**
 * Adapt a stored point (e.g. a Pin1 registered position) taught in
 * `sourcePocket` to `targetPocket`: translate+scale via pocket-relative
 * fractions. When `rotationDeg` is non-zero, the adapted point is
 * additionally rotated about the TARGET pocket's centre — that is the
 * only rotation in this helper set, and it applies to the adapted
 * point, not to the source geometry. With rotationDeg = 0 (default)
 * this is pure translate+scale.
 */
export function adaptPointToPocket(
  point: PocketPoint,
  sourcePocket: PocketBox,
  targetPocket: PocketBox,
  rotationDeg = 0,
): PocketPoint {
  const adapted = pocketRelativeToAbsolute(
    absoluteToPocketRelative(point, sourcePocket),
    targetPocket,
  );

  if (rotationDeg === 0) {
    return adapted;
  }

  const theta = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const centreX = targetPocket.x + targetPocket.width / 2;
  const centreY = targetPocket.y + targetPocket.height / 2;
  const relX = adapted.x - centreX;
  const relY = adapted.y - centreY;

  return {
    x: centreX + relX * cos - relY * sin,
    y: centreY + relX * sin + relY * cos,
  };
}

/**
 * Adapt a stored box (e.g. a pattern box) taught in `sourcePocket` to
 * `targetPocket`: origin via pocket-relative fractions, size scaled by
 * the pocket width/height ratios. With rotationDeg = 0 (default) this
 * is pure translate+scale and the result is the exact scaled box.
 * With a non-zero rotation the four adapted corners are rotated about
 * the target pocket's centre and the AXIS-ALIGNED BOUNDING BOX of the
 * rotated corners is returned — an oriented box cannot be represented
 * by PocketBox, so callers that need orientation must keep the angle
 * alongside this box rather than reading orientation from it.
 */
export function adaptBoxToPocket(
  box: PocketBox,
  sourcePocket: PocketBox,
  targetPocket: PocketBox,
  rotationDeg = 0,
): PocketBox {
  const topLeft = adaptPointToPocket(
    { x: box.x, y: box.y },
    sourcePocket,
    targetPocket,
    rotationDeg,
  );
  const bottomRight = adaptPointToPocket(
    { x: box.x + box.width, y: box.y + box.height },
    sourcePocket,
    targetPocket,
    rotationDeg,
  );

  if (rotationDeg === 0) {
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }

  const topRight = adaptPointToPocket(
    { x: box.x + box.width, y: box.y },
    sourcePocket,
    targetPocket,
    rotationDeg,
  );
  const bottomLeft = adaptPointToPocket(
    { x: box.x, y: box.y + box.height },
    sourcePocket,
    targetPocket,
    rotationDeg,
  );
  const xs = [topLeft.x, topRight.x, bottomRight.x, bottomLeft.x];
  const ys = [topLeft.y, topRight.y, bottomRight.y, bottomLeft.y];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
