import type { WorkpieceImageData } from "./workpiece-rule-analyzer";

export interface CarrierTapePocket {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isEmpty: boolean;
  presenceConfidence: number;
  bodyRegion: {
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

export interface TapeSegmentationResult {
  totalPockets: number;
  emptyCount: number;
  filledCount: number;
  pockets: CarrierTapePocket[];
  sprocketHolePitchPx?: number;
  isMultiPocket: boolean;
}

interface PocketPresenceCheck {
  isEmpty: boolean;
  presenceConfidence: number;
  bodyStdDev: number;
  highLeadPixels: number;
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

  let leadMaxLuma1 = 0;
  let leadMaxLuma2 = 0;
  let highLeadPixels = 0;

  for (let y = leadY1; y < leadY1 + leadH1 && y < h; y += 1) {
    for (let x = leadXStart; x < leadXEnd && x < w; x += 1) {
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
    }
  }

  for (let y = leadY2; y < leadY2 + leadH2 && y < h; y += 1) {
    for (let x = leadXStart; x < leadXEnd && x < w; x += 1) {
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
    }
  }

  // Component body zone: central area (28% to 72% vertical, 18% to 82% horizontal)
  const bodyY = pocket.y + Math.floor(pocket.height * 0.28);
  const bodyH = Math.floor(pocket.height * 0.44);
  const bodyXStart = pocket.x + Math.floor(pocket.width * 0.18);
  const bodyXEnd = pocket.x + Math.floor(pocket.width * 0.82);

  let bodySum = 0;
  let bodySumSq = 0;
  let bodyCount = 0;

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
    }
  }

  const bodyMean = bodyCount > 0 ? bodySum / bodyCount : 0;
  const variance = bodyCount > 0 ? Math.max(0, bodySumSq / bodyCount - bodyMean * bodyMean) : 0;
  const bodyStdDev = Math.sqrt(variance);

  // In an IC package, metallic pins reflect luma > 110 on both top and bottom rows
  const hasLeadReflections = leadMaxLuma1 > 110 && leadMaxLuma2 > 110;
  const hasStrongTexture = bodyStdDev >= 18.0;
  const hasLeadCount = highLeadPixels >= 120;

  // If the pocket floor is uniform (low stdDev) and lacks dual-row lead reflections, it is EMPTY
  const isEmpty =
    (bodyStdDev < 14.5 && !hasLeadCount) ||
    (!hasLeadReflections && highLeadPixels < 80) ||
    bodyStdDev < 11.0;

  let presenceConfidence = 1.0;

  if (isEmpty) {
    presenceConfidence = Math.max(0.0, Math.min(0.4, bodyStdDev / 30));
  } else {
    presenceConfidence = Math.min(1.0, Math.max(0.65, (bodyStdDev / 35) * (hasLeadReflections ? 1.0 : 0.8)));
  }

  return {
    isEmpty,
    presenceConfidence,
    bodyStdDev,
    highLeadPixels,
  };
}

export function segmentCarrierTapePockets(
  imageData: WorkpieceImageData,
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
      bodyRegion: {
        x: Math.round(w * 0.18),
        y: Math.round(h * 0.28),
        width: Math.round(w * 0.64),
        height: Math.round(h * 0.44),
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

    return {
      totalPockets: 1,
      emptyCount: presence.isEmpty ? 1 : 0,
      filledCount: presence.isEmpty ? 0 : 1,
      pockets: [singlePocket],
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
  const pocketHeight = Math.floor(h * 0.80);

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
      bodyRegion: {
        x: px + Math.round(pw * 0.18),
        y: pocketTop + Math.round(pocketHeight * 0.28),
        width: Math.round(pw * 0.64),
        height: Math.round(pocketHeight * 0.44),
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

  return {
    totalPockets: pockets.length,
    emptyCount,
    filledCount,
    pockets,
    isMultiPocket: pockets.length > 1,
  };
}
