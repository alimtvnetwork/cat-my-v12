import type {
  AnalyzeCoatingParams,
  CieLabColor,
  ConformalCoatingResult,
  RgbColor,
  UncoatedVoidItem,
} from "@/domain/vision/conformal-coating-types";

export function srgbToLinear(c: number): number {
  const norm = Math.max(0, Math.min(255, c)) / 255;

  if (norm <= 0.04045) {
    return norm / 12.92;
  }

  return Math.pow((norm + 0.055) / 1.055, 2.4);
}

export function srgbToCieLab(r: number, g: number, b: number): CieLabColor {
  const rLin = srgbToLinear(r);
  const gLin = srgbToLinear(g);
  const bLin = srgbToLinear(b);

  const x = 0.4124564 * rLin + 0.3575761 * gLin + 0.1804375 * bLin;
  const y = 0.2126729 * rLin + 0.7151522 * gLin + 0.0721750 * bLin;
  const z = 0.0193339 * rLin + 0.1191920 * gLin + 0.9503041 * bLin;

  // D65 reference white
  const xn = 0.95047;
  const yn = 1.00000;
  const zn = 1.08883;

  const xr = x / xn;
  const yr = y / yn;
  const zr = z / zn;

  const delta = 6 / 29;
  const deltaCube = delta * delta * delta;

  const fx = xr > deltaCube ? Math.cbrt(xr) : (xr / (3 * delta * delta)) + (4 / 29);
  const fy = yr > deltaCube ? Math.cbrt(yr) : (yr / (3 * delta * delta)) + (4 / 29);
  const fz = zr > deltaCube ? Math.cbrt(zr) : (zr / (3 * delta * delta)) + (4 / 29);

  const l = Math.max(0, Math.min(100, 116 * fy - 16));
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);

  return {
    l: Math.round(l * 100) / 100,
    a: Math.round(a * 100) / 100,
    b: Math.round(bVal * 100) / 100,
  };
}

export function computeDeltaE(c1: CieLabColor, c2: CieLabColor): number {
  const dl = c1.l - c2.l;
  const da = c1.a - c2.a;
  const db = c1.b - c2.b;
  const dist = Math.sqrt(dl * dl + da * da + db * db);

  return Math.round(dist * 100) / 100;
}

export function calculateFluorescenceSignal(
  r: number,
  g: number,
  b: number,
  channel: "uv-blue" | "uv-green" | "luminance",
): number {
  if (channel === "uv-blue") {
    // Optical brightener tracer fluoresces predominantly in blue (420-480nm)
    return Math.max(0, Math.min(255, 1.5 * b - 0.5 * (r + g)));
  }

  if (channel === "uv-green") {
    // High-temp silicone coating with green-yellow tracer
    return Math.max(0, Math.min(255, 1.5 * g - 0.5 * (r + b)));
  }

  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function analyzeConformalCoating(params: AnalyzeCoatingParams): ConformalCoatingResult {
  const {
    imageData,
    roi,
    inspectionMode,
    uvChannel = "uv-blue",
    fluorescenceThreshold = 110,
    minCoveragePct = 95,
    maxDeltaE = 5.0,
    targetLab = { l: 60, a: -10, b: 35 },
    maxAllowedVoids = 0,
    minVoidAreaPx = 8,
  } = params;

  const startX = Math.max(0, Math.min(imageData.width - 1, Math.round(roi.x)));
  const startY = Math.max(0, Math.min(imageData.height - 1, Math.round(roi.y)));
  const endX = Math.max(1, Math.min(imageData.width, Math.round(roi.x + roi.width)));
  const endY = Math.max(1, Math.min(imageData.height, Math.round(roi.y + roi.height)));

  const roiWidth = Math.max(1, endX - startX);
  const roiHeight = Math.max(1, endY - startY);
  const totalPixels = roiWidth * roiHeight;

  if (totalPixels <= 0) {
    return {
      coveragePct: 0,
      coatedPixelCount: 0,
      totalPixelCount: 0,
      meanLuma: 0,
      meanRgb: { r: 0, g: 0, b: 0 },
      meanLab: { l: 0, a: 0, b: 0 },
      deltaE: 0,
      uncoatedVoidCount: 0,
      uncoatedVoids: [],
      isPass: false,
      hasValidMeasurement: false,
    };
  }

  let coatedPixelCount = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumLuma = 0;

  // Mask of uncoated pixels inside ROI to cluster voids
  const isUncoatedMask = new Uint8Array(roiWidth * roiHeight);

  for (let y = startY; y < endY; y += 1) {
    const rowOffset = y * imageData.width;
    const localY = y - startY;

    for (let x = startX; x < endX; x += 1) {
      const idx = (rowOffset + x) * 4;
      const r = imageData.rgba[idx];
      const g = imageData.rgba[idx + 1];
      const b = imageData.rgba[idx + 2];

      sumR += r;
      sumG += g;
      sumB += b;

      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      sumLuma += luma;

      let isCoated = false;

      if (inspectionMode === "cie-lab-color") {
        const pixLab = srgbToCieLab(r, g, b);
        const de = computeDeltaE(pixLab, targetLab);
        isCoated = de <= maxDeltaE;
      } else {
        const signal = calculateFluorescenceSignal(r, g, b, uvChannel);
        isCoated = signal >= fluorescenceThreshold;
      }

      const localIdx = localY * roiWidth + (x - startX);

      if (isCoated) {
        coatedPixelCount += 1;
      } else {
        isUncoatedMask[localIdx] = 1;
      }
    }
  }

  const meanR = Math.round(sumR / totalPixels);
  const meanG = Math.round(sumG / totalPixels);
  const meanB = Math.round(sumB / totalPixels);
  const meanRgb: RgbColor = { r: meanR, g: meanG, b: meanB };
  const meanLuma = Math.round((sumLuma / totalPixels) * 10) / 10;
  const meanLab = srgbToCieLab(meanR, meanG, meanB);
  const deltaE = computeDeltaE(meanLab, targetLab);

  const coveragePct = Math.round((coatedPixelCount / totalPixels) * 1000) / 10;

  // Uncoated void clustering using connected grid analysis
  const uncoatedVoids: UncoatedVoidItem[] = [];
  const visited = new Uint8Array(roiWidth * roiHeight);

  for (let ly = 0; ly < roiHeight; ly += 2) {
    for (let lx = 0; lx < roiWidth; lx += 2) {
      const initIdx = ly * roiWidth + lx;

      if (isUncoatedMask[initIdx] === 0 || visited[initIdx] === 1) {
        continue;
      }

      // BFS to find void cluster bounds
      let minX = lx;
      let maxX = lx;
      let minY = ly;
      let maxY = ly;
      let clusterArea = 0;

      const queue: number[] = [initIdx];
      visited[initIdx] = 1;

      while (queue.length > 0) {
        const curr = queue.pop()!;
        clusterArea += 1;

        const cy = Math.floor(curr / roiWidth);
        const cx = curr % roiWidth;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        // Check 4-connected neighbors with step of 1
        const neighbors = [
          cx > 0 ? curr - 1 : -1,
          cx + 1 < roiWidth ? curr + 1 : -1,
          cy > 0 ? curr - roiWidth : -1,
          cy + 1 < roiHeight ? curr + roiWidth : -1,
        ];

        for (const n of neighbors) {
          if (n >= 0 && isUncoatedMask[n] === 1 && visited[n] === 0) {
            visited[n] = 1;
            queue.push(n);
          }
        }
      }

      if (clusterArea >= minVoidAreaPx) {
        uncoatedVoids.push({
          x: startX + minX,
          y: startY + minY,
          width: Math.max(2, maxX - minX + 1),
          height: Math.max(2, maxY - minY + 1),
          areaPx: clusterArea,
        });
      }
    }
  }

  let isPass = false;

  if (inspectionMode === "keep-out-zone") {
    // Keep-Out Zone passes when coating is NOT present (breach if coated)
    isPass = coatedPixelCount === 0 || coveragePct <= 2.0;
  } else if (inspectionMode === "cie-lab-color") {
    isPass = deltaE <= maxDeltaE && coveragePct >= minCoveragePct;
  } else {
    // UV Fluorescence
    const isCoveragePass = coveragePct >= minCoveragePct;
    const isVoidPass = uncoatedVoids.length <= maxAllowedVoids;
    isPass = isCoveragePass && isVoidPass;
  }

  return {
    coveragePct,
    coatedPixelCount,
    totalPixelCount: totalPixels,
    meanLuma,
    meanRgb,
    meanLab,
    deltaE,
    uncoatedVoidCount: uncoatedVoids.length,
    uncoatedVoids,
    isPass,
    hasValidMeasurement: true,
  };
}
