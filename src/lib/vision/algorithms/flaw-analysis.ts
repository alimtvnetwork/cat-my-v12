/**
 * Pure, dependency-free flaw analysis for surface inspection (spec
 * Category 3: tools T107 scratch/crack and T108 void/porosity).
 *
 * Everything here operates on flat row-major luminance arrays
 * (`luminance[y * width + x]`, Rec. 601 luma in the 0-255 range) and
 * binary masks (any nonzero value counts as foreground, normalized to
 * 1 internally). There are no imports, no DOM/canvas access, and no
 * dependence on the rule analyzer, so these helpers can be unit-tested
 * in isolation and wired into any evaluator.
 *
 * Approximations, stated plainly (see also the per-function notes):
 * - Sobel: the spec's T107 formulation takes the max over four
 *   directional kernels (Kx, Ky, K45, K135) plus a Laplacian term.
 *   This module implements the standard 3x3 Sobel magnitude
 *   sqrt(Gx^2 + Gy^2) only. It is a single combined gradient measure,
 *   not the spec's multi-directional max, and it has no Laplacian
 *   component, so its numeric scale differs from the spec's Gmax
 *   (a clean step of Delta luma yields a Sobel magnitude up to
 *   4 * Delta). Thresholds tuned against the spec formula need
 *   re-tuning against this one.
 * - Crack length: a crack's spine length is the graph diameter of its
 *   skeleton (the longest shortest path between any two skeleton
 *   pixels, orthogonal step = 1, diagonal step = sqrt(2)). For a
 *   simple unbranched spine this equals the spec's ordered polyline
 *   sum; for a branched skeleton it is the longest branch-to-branch
 *   shortest path, NOT the sum of all branches. A straight run of N
 *   skeleton pixels therefore measures N - 1, not N.
 * - Skeleton diameter is exact (BFS from every skeleton pixel of a
 *   component), which is O(n^2) per component in skeleton pixels.
 *   Crack skeletons are small, so this is fine; do not feed it a
 *   dense unthinned mask and expect it to be fast.
 * - Void segmentation is a single threshold (L <= voidThreshold),
 *   not the spec's "multi-threshold" segmentation, and components
 *   below minVoidAreaPx are dropped entirely (noise floor) rather
 *   than counted in the totals.
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ConnectedComponent {
  id: number;
  area: number;
  boundingBox: BoundingBox;
  /** Flat pixel indices (y * width + x) belonging to the component. */
  pixels: number[];
}

export interface ScratchCrackOptions {
  gradientThreshold: number;
  minCrackLengthPx: number;
  maxAllowedDefects: number;
}

export interface ScratchCrackDefect {
  length: number;
  boundingBox: BoundingBox;
}

export interface ScratchCrackResult {
  defectCount: number;
  maxCrackLengthPx: number;
  defects: ScratchCrackDefect[];
  passed: boolean;
}

export interface VoidRoi {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VoidOptions {
  voidThreshold: number;
  minVoidAreaPx: number;
  maxTotalVoidPct: number;
  maxSingleVoidPct: number;
}

export interface VoidResult {
  totalVoidPct: number;
  maxSingleVoidPct: number;
  voidCount: number;
  padAreaPx: number;
  passed: boolean;
}

const SQRT_2 = Math.SQRT2;

/** 8-neighbour offsets (orthogonal and diagonal), row-major. */
const NEIGHBOURS_8: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

function assertDimensions(width: number, height: number, length: number, label: string): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`${label}: width and height must be positive integers`);
  }

  if (length < width * height) {
    throw new Error(
      `${label}: array length ${length} is smaller than width * height (${width * height})`,
    );
  }
}

function boundingBoxOfPixels(pixels: number[], width: number): BoundingBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const idx of pixels) {
    const x = idx % width;
    const y = Math.floor(idx / width);

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * 3x3 Sobel gradient magnitude, sqrt(Gx^2 + Gy^2), one value per pixel.
 *
 * Gx kernel: [-1 0 1; -2 0 2; -1 0 1]
 * Gy kernel: [-1 -2 -1; 0 0 0; 1 2 1]
 *
 * Border pixels (the outermost 1px ring) have no full 3x3 neighbourhood
 * and are reported as 0 rather than inventing neighbours by padding or
 * reflection; a crack touching the image edge therefore loses its
 * outermost ring of gradient response.
 */
export function sobelGradientMagnitude(
  luminance: ArrayLike<number>,
  width: number,
  height: number,
): number[] {
  assertDimensions(width, height, luminance.length, "sobelGradientMagnitude");

  const magnitude = new Array<number>(width * height).fill(0);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const nw = luminance[(y - 1) * width + (x - 1)];
      const n = luminance[(y - 1) * width + x];
      const ne = luminance[(y - 1) * width + (x + 1)];
      const w = luminance[y * width + (x - 1)];
      const e = luminance[y * width + (x + 1)];
      const sw = luminance[(y + 1) * width + (x - 1)];
      const s = luminance[(y + 1) * width + x];
      const se = luminance[(y + 1) * width + (x + 1)];

      const gx = -nw + ne - 2 * w + 2 * e - sw + se;
      const gy = -nw - 2 * n - ne + sw + 2 * s + se;

      magnitude[y * width + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  return magnitude;
}

/**
 * Zhang-Suen morphological thinning of a binary mask to a
 * single-pixel-wide skeleton. Returns a new Uint8Array (0/1); the input
 * is not mutated.
 *
 * Neighbours are ordered clockwise from north: P2=N, P3=NE, P4=E,
 * P5=SE, P6=S, P7=SW, P8=W, P9=NW. A foreground pixel is deletable in a
 * sub-iteration when 2 <= B(p) <= 6 (B = foreground neighbour count)
 * and A(p) == 1 (A = number of 0->1 transitions around the ordered
 * neighbourhood), plus the sub-iteration's product conditions
 * (sub-iteration 1: P2*P4*P6 == 0 and P4*P6*P8 == 0; sub-iteration 2:
 * P2*P4*P8 == 0 and P2*P6*P8 == 0). The two sub-iterations repeat
 * until a full pass deletes nothing. Pixels outside the image are
 * treated as background (0).
 */
export function zhangSuenThinning(
  mask: ArrayLike<number>,
  width: number,
  height: number,
): Uint8Array {
  assertDimensions(width, height, mask.length, "zhangSuenThinning");

  const image = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i += 1) {
    image[i] = mask[i] !== 0 ? 1 : 0;
  }

  // Neighbour offsets in P2..P9 order (clockwise from north).
  const offsets: ReadonlyArray<readonly [number, number]> = [
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
  ];

  const at = (x: number, y: number): number => {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return 0;
    }

    return image[y * width + x];
  };

  let changed = true;

  while (changed) {
    changed = false;

    // Sub-iteration 1 and sub-iteration 2 differ only in the product
    // conditions; the B/A conditions are shared.
    for (let subIteration = 1; subIteration <= 2; subIteration += 1) {
      const toDelete: number[] = [];

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (at(x, y) !== 1) {
            continue;
          }

          const p = offsets.map(([dx, dy]) => at(x + dx, y + dy));
          // P2, P4, P6, P8 are the cardinal neighbours (indices 0, 2, 4, 6
          // of the clockwise P2..P9 order); the diagonals enter only via
          // the B/A counts above.
          const p2 = p[0];
          const p4 = p[2];
          const p6 = p[4];
          const p8 = p[6];
          const b = p.reduce((sum, value) => sum + value, 0);

          if (b < 2 || b > 6) {
            continue;
          }

          let transitions = 0;

          for (let i = 0; i < 8; i += 1) {
            if (p[i] === 0 && p[(i + 1) % 8] === 1) {
              transitions += 1;
            }
          }

          if (transitions !== 1) {
            continue;
          }

          const condition =
            subIteration === 1
              ? p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0
              : p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0;

          if (condition) {
            toDelete.push(y * width + x);
          }
        }
      }

      if (toDelete.length > 0) {
        changed = true;

        for (const idx of toDelete) {
          image[idx] = 0;
        }
      }
    }
  }

  return image;
}

/**
 * 8-way connected-component labelling of a binary mask (foreground =
 * nonzero), via iterative flood fill over the 8-neighbourhood. Returns
 * one entry per component with sequential ids starting at 0, its pixel
 * count, its bounding box, and its pixel indices. This is a local
 * implementation of the same 8-way labelling the spec uses for T108
 * voids and T109 blobs; it deliberately does not import the analyzer
 * or any other module, keeping this file dependency-free.
 */
export function connectedComponents8Way(
  mask: ArrayLike<number>,
  width: number,
  height: number,
): ConnectedComponent[] {
  assertDimensions(width, height, mask.length, "connectedComponents8Way");

  const visited = new Uint8Array(width * height);
  const components: ConnectedComponent[] = [];

  for (let start = 0; start < width * height; start += 1) {
    if (mask[start] === 0 || visited[start] === 1) {
      continue;
    }

    const pixels: number[] = [];
    const stack: number[] = [start];
    visited[start] = 1;

    while (stack.length > 0) {
      const idx = stack.pop() as number;
      pixels.push(idx);

      const x = idx % width;
      const y = Math.floor(idx / width);

      for (const [dx, dy] of NEIGHBOURS_8) {
        const nx = x + dx;
        const ny = y + dy;

        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          continue;
        }

        const nIdx = ny * width + nx;

        if (mask[nIdx] !== 0 && visited[nIdx] === 0) {
          visited[nIdx] = 1;
          stack.push(nIdx);
        }
      }
    }

    components.push({
      id: components.length,
      area: pixels.length,
      boundingBox: boundingBoxOfPixels(pixels, width),
      pixels,
    });
  }

  return components;
}

/**
 * Longest shortest path (graph diameter) over a skeleton mask, in
 * pixels, with orthogonal steps costing 1 and diagonal steps costing
 * sqrt(2). Computed per connected component (8-way) by breadth-first
 * search from every skeleton pixel of that component, and reported as
 * the maximum over components; an empty mask measures 0 and a single
 * isolated pixel measures 0 (a path needs at least two pixels).
 *
 * See the module header for the branching-skeleton caveat: this is
 * the longest shortest path, not the sum of all branch lengths.
 */
export function skeletonDiameter(
  skeleton: ArrayLike<number>,
  width: number,
  height: number,
): number {
  assertDimensions(width, height, skeleton.length, "skeletonDiameter");

  const components = connectedComponents8Way(skeleton, width, height);
  let diameter = 0;

  for (const component of components) {
    const member = new Uint8Array(width * height);

    for (const idx of component.pixels) {
      member[idx] = 1;
    }

    for (const source of component.pixels) {
      const distance = new Float64Array(width * height).fill(-1);
      const queue: number[] = [source];
      let head = 0;
      distance[source] = 0;

      while (head < queue.length) {
        const idx = queue[head] as number;
        head += 1;

        const x = idx % width;
        const y = Math.floor(idx / width);

        for (const [dx, dy] of NEIGHBOURS_8) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
            continue;
          }

          const nIdx = ny * width + nx;

          if (member[nIdx] === 0 || distance[nIdx] !== -1) {
            continue;
          }

          const step = dx === 0 || dy === 0 ? 1 : SQRT_2;
          distance[nIdx] = distance[idx] + step;

          if (distance[nIdx] > diameter) {
            diameter = distance[nIdx];
          }

          queue.push(nIdx);
        }
      }
    }
  }

  return diameter;
}

/**
 * T107 scratch/crack analysis: Sobel gradient magnitude, thresholded
 * at gradientThreshold, thinned with Zhang-Suen, then each skeleton
 * component measured by its graph diameter. Only components with
 * length >= minCrackLengthPx are reported as defects (sorted longest
 * first); defectCount is the count of reported defects, and the result
 * passes iff defectCount <= maxAllowedDefects (spec pass rule, 0 =
 * zero tolerance). An empty or below-threshold image passes with
 * defectCount 0 and maxCrackLengthPx 0.
 */
export function analyzeScratchCracks(
  luminance: ArrayLike<number>,
  width: number,
  height: number,
  options: ScratchCrackOptions,
): ScratchCrackResult {
  const magnitude = sobelGradientMagnitude(luminance, width, height);
  const binary = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i += 1) {
    binary[i] = magnitude[i] >= options.gradientThreshold ? 1 : 0;
  }

  const skeleton = zhangSuenThinning(binary, width, height);
  const components = connectedComponents8Way(skeleton, width, height);

  // Dark-defect polarity: this tool targets dark defects (its spec
  // cases are dark lines on a bright field), but Sobel magnitude is
  // polarity-blind, so on real device images it also traces bright
  // structural edges — lead edges, tape bands, markings — as
  // "cracks". A skeleton whose pixels are on average brighter than
  // the ROI mean traces such a bright structure, not a dark crack,
  // so it is not counted. A genuine dark scratch skeletonizes on
  // its mid-luma transition pixels, still darker than its bright
  // field, so the spec cases keep passing.
  let roiLumaSum = 0;

  for (let i = 0; i < width * height; i += 1) {
    roiLumaSum += luminance[i];
  }

  const roiMeanLuma = roiLumaSum / Math.max(1, width * height);

  const defects: ScratchCrackDefect[] = [];

  for (const component of components) {
    // Diameter of a single component: reuse the shared labelling by
    // measuring this component's pixels in isolation. A component
    // mask keeps skeletonDiameter's per-component maximum equal to
    // this component's own diameter.
    const componentMask = new Uint8Array(width * height);

    for (const idx of component.pixels) {
      componentMask[idx] = 1;
    }

    const length = skeletonDiameter(componentMask, width, height);

    let skeletonLumaSum = 0;

    for (const idx of component.pixels) {
      skeletonLumaSum += luminance[idx];
    }

    const skeletonMeanLuma = skeletonLumaSum / Math.max(1, component.pixels.length);
    const isDarkDefect = skeletonMeanLuma < roiMeanLuma;

    if (length >= options.minCrackLengthPx && isDarkDefect) {
      defects.push({ length, boundingBox: component.boundingBox });
    }
  }

  defects.sort((a, b) => b.length - a.length);

  const maxCrackLengthPx = defects.length > 0 ? defects[0].length : 0;

  return {
    defectCount: defects.length,
    maxCrackLengthPx,
    defects,
    passed: defects.length <= options.maxAllowedDefects,
  };
}

/**
 * T108 void/porosity analysis (IPC-A-610 Class 3): within the (clamped)
 * ROI, pixels with L <= voidThreshold are void pixels; 8-way connected
 * components are the void bubbles. Components smaller than
 * minVoidAreaPx are dropped as noise and contribute to neither the
 * totals nor the count. Percentages are relative to the clamped ROI
 * area (padAreaPx). The result passes iff totalVoidPct <=
 * maxTotalVoidPct AND maxSingleVoidPct <= maxSingleVoidPct (spec
 * conjunction). A ROI that clamps to zero area yields all-zero metrics
 * and passes vacuously.
 */
export function analyzeVoids(
  luminance: ArrayLike<number>,
  width: number,
  height: number,
  roi: VoidRoi,
  options: VoidOptions,
): VoidResult {
  assertDimensions(width, height, luminance.length, "analyzeVoids");

  const x0 = Math.max(0, Math.floor(roi.x));
  const y0 = Math.max(0, Math.floor(roi.y));
  const x1 = Math.min(width, Math.ceil(roi.x + roi.width));
  const y1 = Math.min(height, Math.ceil(roi.y + roi.height));
  const roiWidth = Math.max(0, x1 - x0);
  const roiHeight = Math.max(0, y1 - y0);
  const padAreaPx = roiWidth * roiHeight;

  if (padAreaPx === 0) {
    return {
      totalVoidPct: 0,
      maxSingleVoidPct: 0,
      voidCount: 0,
      padAreaPx: 0,
      passed: true,
    };
  }

  const mask = new Uint8Array(width * height);

  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const idx = y * width + x;
      mask[idx] = luminance[idx] <= options.voidThreshold ? 1 : 0;
    }
  }

  const bubbles = connectedComponents8Way(mask, width, height).filter(
    (component) => component.area >= options.minVoidAreaPx,
  );

  let totalVoidPx = 0;
  let maxSingleVoidPx = 0;

  for (const bubble of bubbles) {
    totalVoidPx += bubble.area;

    if (bubble.area > maxSingleVoidPx) {
      maxSingleVoidPx = bubble.area;
    }
  }

  const totalVoidPct = (totalVoidPx / padAreaPx) * 100;
  const maxSingleVoidPct = (maxSingleVoidPx / padAreaPx) * 100;

  return {
    totalVoidPct,
    maxSingleVoidPct,
    voidCount: bubbles.length,
    padAreaPx,
    passed: totalVoidPct <= options.maxTotalVoidPct && maxSingleVoidPct <= options.maxSingleVoidPct,
  };
}
