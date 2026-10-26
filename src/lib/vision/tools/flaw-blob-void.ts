/**
 * Flaw & surface inspection tools, spec section 4 (Category 3).
 *
 * Pure, dependency-free implementations operating on luminance arrays.
 * Nothing in this file touches the DOM, the filesystem, or any store, so
 * it can be unit-tested with synthetic images and wired into the analyzer
 * later by a caller that supplies the luminance data.
 *
 * Tools implemented:
 * - T109 Binary Blob (solder bridge detector)
 * - T108 Void / Porosity (IPC-A-610 Class 3)
 * - T107 Scratch / Crack (Sobel + Zhang-Suen thinning)
 *
 * Shared primitive: 8-way connected component labeling (two-pass,
 * union-find), per spec section 4, T109 algorithmic formulation.
 */

export interface LuminanceImage {
  width: number;
  height: number;
  /** Row-major luminance, one value per pixel, length >= width * height. */
  data: ArrayLike<number>;
}

export interface BoundingBox {
  /** Leftmost pixel column (inclusive). */
  x: number;
  /** Topmost pixel row (inclusive). */
  y: number;
  /** Pixel count in x (xMax - xMin + 1). */
  width: number;
  /** Pixel count in y (yMax - yMin + 1). */
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface ConnectedComponent {
  id: number;
  /** Pixel count (spec moment m00). */
  area: number;
  /** Mean pixel position, per spec: xBar = sum(x) / m00, yBar = sum(y) / m00. */
  centroid: Point;
  boundingBox: BoundingBox;
}

function validateImage(image: LuminanceImage): void {
  if (!Number.isInteger(image.width) || image.width <= 0) {
    throw new RangeError("flaw-blob-void: image width must be a positive integer");
  }

  if (!Number.isInteger(image.height) || image.height <= 0) {
    throw new RangeError("flaw-blob-void: image height must be a positive integer");
  }

  if (image.data.length < image.width * image.height) {
    throw new RangeError("flaw-blob-void: image data is shorter than width * height");
  }
}

function validateNonNegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`flaw-blob-void: ${name} must be a finite number >= 0`);
  }
}

/**
 * 8-way connected component labeling, two-pass with union-find.
 *
 * First pass assigns provisional labels, unioning a foreground pixel with
 * its already-visited 8-neighbours (left, top-left, top, top-right).
 * Second pass resolves each provisional label to its union-find root and
 * accumulates area, centroid sums, and bounding box per component.
 *
 * `mask` is row-major, length >= width * height; 0 means background and
 * any non-zero value means foreground. Returned components are sorted by
 * id, which follows first-appearance order in row-major scan order.
 */
export function labelConnectedComponents(
  mask: ArrayLike<number>,
  width: number,
  height: number,
): ConnectedComponent[] {
  if (!Number.isInteger(width) || width <= 0) {
    throw new RangeError("flaw-blob-void: width must be a positive integer");
  }

  if (!Number.isInteger(height) || height <= 0) {
    throw new RangeError("flaw-blob-void: height must be a positive integer");
  }

  if (mask.length < width * height) {
    throw new RangeError("flaw-blob-void: mask is shorter than width * height");
  }

  const labels = new Int32Array(width * height);
  const parent: number[] = [0];
  let nextLabel = 0;

  const find = (label: number): number => {
    let root = label;

    while (parent[root] !== root) {
      root = parent[root];
    }

    // Path compression: point every label on the path at the root.
    let current = label;

    while (parent[current] !== root) {
      const next = parent[current];
      parent[current] = root;
      current = next;
    }

    return root;
  };

  const union = (a: number, b: number): void => {
    const rootA = find(a);
    const rootB = find(b);

    if (rootA !== rootB) {
      parent[rootB] = rootA;
    }
  };

  // First pass: provisional labels + equivalences.
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;

      if (!mask[index]) {
        continue;
      }

      // Already-visited 8-neighbours: left, top-left, top, top-right.
      const neighbours: number[] = [];

      if (x > 0 && labels[index - 1] !== 0) {
        neighbours.push(labels[index - 1]);
      }

      if (x > 0 && y > 0 && labels[index - width - 1] !== 0) {
        neighbours.push(labels[index - width - 1]);
      }

      if (y > 0 && labels[index - width] !== 0) {
        neighbours.push(labels[index - width]);
      }

      if (x + 1 < width && y > 0 && labels[index - width + 1] !== 0) {
        neighbours.push(labels[index - width + 1]);
      }

      if (neighbours.length === 0) {
        nextLabel += 1;
        parent[nextLabel] = nextLabel;
        labels[index] = nextLabel;
      } else {
        const first = neighbours[0];
        labels[index] = first;

        for (const neighbour of neighbours.slice(1)) {
          union(first, neighbour);
        }
      }
    }
  }

  // Second pass: resolve roots and accumulate per-component statistics.
  interface Accumulator {
    area: number;
    sumX: number;
    sumY: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }

  const byRoot = new Map<number, Accumulator>();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const label = labels[index];

      if (label === 0) {
        continue;
      }

      const root = find(label);
      let acc = byRoot.get(root);

      if (!acc) {
        acc = { area: 0, sumX: 0, sumY: 0, minX: x, minY: y, maxX: x, maxY: y };
        byRoot.set(root, acc);
      }

      acc.area += 1;
      acc.sumX += x;
      acc.sumY += y;

      if (x < acc.minX) {
        acc.minX = x;
      }

      if (y < acc.minY) {
        acc.minY = y;
      }

      if (x > acc.maxX) {
        acc.maxX = x;
      }

      if (y > acc.maxY) {
        acc.maxY = y;
      }
    }
  }

  // Sort by first-appearance order (smallest root label first is not
  // guaranteed after unions, so sort by topmost, then leftmost pixel).
  const components: ConnectedComponent[] = Array.from(byRoot.values()).map((acc) => ({
    id: 0,
    area: acc.area,
    centroid: { x: acc.sumX / acc.area, y: acc.sumY / acc.area },
    boundingBox: {
      x: acc.minX,
      y: acc.minY,
      width: acc.maxX - acc.minX + 1,
      height: acc.maxY - acc.minY + 1,
    },
  }));

  components.sort((a, b) => a.boundingBox.y - b.boundingBox.y || a.boundingBox.x - b.boundingBox.x);

  for (let i = 0; i < components.length; i += 1) {
    components[i].id = i + 1;
  }

  return components;
}

// ---------------------------------------------------------------------------
// T109 Binary Blob (solder bridge detector)
// ---------------------------------------------------------------------------

export interface BinaryBlobParams {
  /** Luma separating bright metallic solder from dark mask. Spec default 140. */
  binarizeThreshold?: number;
  /** Blob area required to trigger rejection. Spec default 15 px. */
  minDefectAreaPx?: number;
  /** Maximum acceptable bridge count (0 = zero tolerance). Spec default 0. */
  maxAllowedDefects?: number;
}

export interface BinaryBlobResult {
  /** Spec pass rule: blobCount <= maxAllowedDefects. */
  pass: boolean;
  blobCount: number;
  totalBlobArea: number;
  /** Only blobs with area >= minDefectAreaPx, in scan order. */
  blobs: ConnectedComponent[];
}

export function analyzeBinaryBlobs(
  image: LuminanceImage,
  params: BinaryBlobParams = {},
): BinaryBlobResult {
  validateImage(image);

  const binarizeThreshold = params.binarizeThreshold ?? 140;
  const minDefectAreaPx = params.minDefectAreaPx ?? 15;
  const maxAllowedDefects = params.maxAllowedDefects ?? 0;

  validateNonNegativeFinite(binarizeThreshold, "binarizeThreshold");
  validateNonNegativeFinite(minDefectAreaPx, "minDefectAreaPx");
  validateNonNegativeFinite(maxAllowedDefects, "maxAllowedDefects");

  const mask = new Uint8Array(image.width * image.height);

  for (let i = 0; i < mask.length; i += 1) {
    // Bright solder reflection is foreground; dark mask is background.
    mask[i] = image.data[i] >= binarizeThreshold ? 1 : 0;
  }

  const all = labelConnectedComponents(mask, image.width, image.height);
  const blobs = all.filter((blob) => blob.area >= minDefectAreaPx);

  // Re-number after filtering so ids are dense 1..blobCount.
  for (let i = 0; i < blobs.length; i += 1) {
    blobs[i] = { ...blobs[i], id: i + 1 };
  }

  let totalBlobArea = 0;

  for (const blob of blobs) {
    totalBlobArea += blob.area;
  }

  return {
    pass: blobs.length <= maxAllowedDefects,
    blobCount: blobs.length,
    totalBlobArea,
    blobs,
  };
}

// ---------------------------------------------------------------------------
// T108 Void / Porosity (IPC-A-610 Class 3)
// ---------------------------------------------------------------------------

export interface PadRoi {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VoidPorosityParams {
  /**
   * Luma at or below which a pad pixel counts as void. Default 110, as
   * specified for this implementation; the spec's multi-thresholding is
   * reduced to this single threshold (no Otsu is implemented here).
   */
  voidThreshold?: number;
  /** Noise floor ignoring microscopic grain structure. Spec default 5 px. */
  minVoidAreaPx?: number;
  /** Cumulative void limit, IPC-A-610 Class 3. Spec default 25 (%). */
  maxTotalVoidPct?: number;
  /** Maximum allowable single void bubble ratio. Spec default 15 (%). */
  maxSingleVoidPct?: number;
}

export interface VoidPorosityResult {
  /** Spec pass rule: totalVoidPct <= maxTotalVoidPct AND maxSingleVoidPct <= maxSingleVoidPct. */
  pass: boolean;
  totalVoidPct: number;
  maxSingleVoidPct: number;
  /** Bubbles with area >= minVoidAreaPx only; percentages use this same set. */
  voidCount: number;
  /** Pixel count of the (clipped) pad ROI. */
  padAreaPx: number;
  /** Detail for the counted bubbles, in scan order. */
  voids: ConnectedComponent[];
}

export function analyzeVoidPorosity(
  image: LuminanceImage,
  roi: PadRoi,
  params: VoidPorosityParams = {},
): VoidPorosityResult {
  validateImage(image);

  if (!Number.isInteger(roi.width) || roi.width <= 0) {
    throw new RangeError("flaw-blob-void: pad ROI width must be a positive integer");
  }

  if (!Number.isInteger(roi.height) || roi.height <= 0) {
    throw new RangeError("flaw-blob-void: pad ROI height must be a positive integer");
  }

  const voidThreshold = params.voidThreshold ?? 110;
  const minVoidAreaPx = params.minVoidAreaPx ?? 5;
  const maxTotalVoidPct = params.maxTotalVoidPct ?? 25;
  const maxSingleVoidPct = params.maxSingleVoidPct ?? 15;

  validateNonNegativeFinite(voidThreshold, "voidThreshold");
  validateNonNegativeFinite(minVoidAreaPx, "minVoidAreaPx");
  validateNonNegativeFinite(maxTotalVoidPct, "maxTotalVoidPct");
  validateNonNegativeFinite(maxSingleVoidPct, "maxSingleVoidPct");

  // Clip the ROI to the image; a ROI fully outside the image is a caller
  // error, not a "clean pad".
  const x0 = Math.max(0, Math.floor(roi.x));
  const y0 = Math.max(0, Math.floor(roi.y));
  const x1 = Math.min(image.width, Math.ceil(roi.x + roi.width));
  const y1 = Math.min(image.height, Math.ceil(roi.y + roi.height));

  if (x1 <= x0 || y1 <= y0) {
    throw new RangeError("flaw-blob-void: pad ROI does not intersect the image");
  }

  const roiWidth = x1 - x0;
  const roiHeight = y1 - y0;
  const padAreaPx = roiWidth * roiHeight;
  const mask = new Uint8Array(roiWidth * roiHeight);

  for (let y = 0; y < roiHeight; y += 1) {
    for (let x = 0; x < roiWidth; x += 1) {
      const luma = image.data[(y0 + y) * image.width + (x0 + x)];

      // Spec: V = { (x, y) in PadROI | L(x, y) <= T_void }.
      mask[y * roiWidth + x] = luma <= voidThreshold ? 1 : 0;
    }
  }

  const all = labelConnectedComponents(mask, roiWidth, roiHeight);
  const voids = all
    .filter((bubble) => bubble.area >= minVoidAreaPx)
    .map((bubble, i) => ({
      ...bubble,
      id: i + 1,
      // Shift bounding box / centroid from ROI-local to image coordinates.
      centroid: { x: bubble.centroid.x + x0, y: bubble.centroid.y + y0 },
      boundingBox: {
        ...bubble.boundingBox,
        x: bubble.boundingBox.x + x0,
        y: bubble.boundingBox.y + y0,
      },
    }));

  let voidArea = 0;
  let maxSingleArea = 0;

  for (const bubble of voids) {
    voidArea += bubble.area;

    if (bubble.area > maxSingleArea) {
      maxSingleArea = bubble.area;
    }
  }

  const totalVoidPct = (voidArea / padAreaPx) * 100;
  const maxSingleVoidPctValue = (maxSingleArea / padAreaPx) * 100;

  return {
    pass: totalVoidPct <= maxTotalVoidPct && maxSingleVoidPctValue <= maxSingleVoidPct,
    totalVoidPct,
    maxSingleVoidPct: maxSingleVoidPctValue,
    voidCount: voids.length,
    padAreaPx,
    voids,
  };
}

// ---------------------------------------------------------------------------
// T107 Scratch / Crack
// ---------------------------------------------------------------------------

export interface ScratchCrackParams {
  /** Gradient threshold for an elevation discontinuity. Spec default 45. */
  gradientThreshold?: number;
  /** Contiguous length required to register a crack. Spec default 12 px. */
  minCrackLengthPx?: number;
  /** Allowable crack count (0 = zero tolerance). Spec default 0. */
  maxAllowedDefects?: number;
}

export interface CrackDefect {
  /**
   * Skeleton spine length in pixels (see length approximation note on
   * analyzeScratchesCracks). Only defects with length >= minCrackLengthPx
   * are included in `defects`.
   */
  length: number;
  boundingBox: BoundingBox;
}

export interface ScratchCrackResult {
  /** Spec pass rule: defectCount <= maxAllowedDefects, where defectCount counts only qualifying cracks. */
  pass: boolean;
  /** Number of defects with length >= minCrackLengthPx. */
  defectCount: number;
  /** Longest qualifying crack length, or 0 when there is none. */
  maxCrackLengthPx: number;
  /** Qualifying cracks, longest first. */
  defects: CrackDefect[];
}

const SOBEL_X: readonly number[] = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
const SOBEL_Y: readonly number[] = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

/**
 * Zhang-Suen morphological thinning (spec section 4, T107 step 2).
 *
 * Iteratively removes border pixels that are not endpoints until stable,
 * leaving single-pixel-wide skeletons. Input and output are row-major
 * 0/1 masks of length width * height; the input is not mutated.
 * The mask is internally padded by one background pixel, so shapes
 * touching the image border are thinned correctly instead of keeping
 * their border pixels forever.
 */
export function skeletonizeBinary(
  mask: ArrayLike<number>,
  width: number,
  height: number,
): Uint8Array {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new RangeError("flaw-blob-void: width and height must be positive integers");
  }

  if (mask.length < width * height) {
    throw new RangeError("flaw-blob-void: mask is shorter than width * height");
  }

  const paddedWidth = width + 2;
  const paddedHeight = height + 2;
  const img = new Uint8Array(paddedWidth * paddedHeight);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      img[(y + 1) * paddedWidth + (x + 1)] = mask[y * width + x] ? 1 : 0;
    }
  }

  const neighbours = (index: number): number[] => {
    // P2..P9 clockwise from north: N, NE, E, SE, S, SW, W, NW.
    // Every pixel visited by the loop below has a full neighbourhood
    // in the padded image, so no border special-case is needed.
    return [
      img[index - paddedWidth],
      img[index - paddedWidth + 1],
      img[index + 1],
      img[index + paddedWidth + 1],
      img[index + paddedWidth],
      img[index + paddedWidth - 1],
      img[index - 1],
      img[index - paddedWidth - 1],
    ];
  };

  let changed = true;

  while (changed) {
    changed = false;

    for (const subIteration of [0, 1] as const) {
      const toDelete: number[] = [];

      for (let y = 1; y < paddedHeight - 1; y += 1) {
        for (let x = 1; x < paddedWidth - 1; x += 1) {
          const index = y * paddedWidth + x;

          if (!img[index]) {
            continue;
          }

          const p = neighbours(index);
          const [p2, p3, p4, p5, p6, p7, p8, p9] = p;
          const b = p.reduce((sum, value) => sum + value, 0);

          if (b < 2 || b > 6) {
            continue;
          }

          // A = number of 0 -> 1 transitions in P2, P3, ..., P9, P2.
          const sequence = [...p, p2];
          let a = 0;

          for (let i = 0; i < sequence.length - 1; i += 1) {
            if (sequence[i] === 0 && sequence[i + 1] === 1) {
              a += 1;
            }
          }

          if (a !== 1) {
            continue;
          }

          const product1 = subIteration === 0 ? p2 * p4 * p6 : p2 * p4 * p8;
          const product2 = subIteration === 0 ? p4 * p6 * p8 : p2 * p6 * p8;

          if (product1 === 0 && product2 === 0) {
            toDelete.push(index);
          }
        }
      }

      if (toDelete.length > 0) {
        changed = true;

        for (const index of toDelete) {
          img[index] = 0;
        }
      }
    }
  }

  // Crop the padding back off.
  const output = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      output[y * width + x] = img[(y + 1) * paddedWidth + (x + 1)];
    }
  }

  return output;
}

/**
 * Length approximation for a skeleton component.
 *
 * The spec defines crack length as the sum of Euclidean steps along an
 * ordered spine. A skeleton is an unordered pixel set, not an ordered
 * path, so we approximate it by the skeleton graph diameter: the
 * longest shortest-path distance between any two skeleton pixels,
 * with orthogonal steps costing 1 and diagonal steps sqrt(2).
 * This matters because Sobel on a finite segment produces a closed
 * contour: summing every skeleton edge would give roughly twice the
 * segment length (the loop perimeter), while the diameter gives the
 * segment length itself (for a loop, the distance between opposite
 * points, i.e. half the perimeter). For a tree-like skeleton the
 * two-sweep Dijkstra below is exact; for a branched skeleton it is
 * a close approximation to the longest branch-to-branch spine.
 * A lone skeleton pixel has length 1.
 * Note: Sobel ridges extend about 1 px beyond each end of a segment,
 * so a measured length is typically the drawn length plus a few px.
 * (Computed inline in analyzeScratchesCracks, where the full image
 * width is in scope for indexing the skeleton.)
 */
export function analyzeScratchesCracks(
  image: LuminanceImage,
  params: ScratchCrackParams = {},
): ScratchCrackResult {
  validateImage(image);

  const gradientThreshold = params.gradientThreshold ?? 45;
  const minCrackLengthPx = params.minCrackLengthPx ?? 12;
  const maxAllowedDefects = params.maxAllowedDefects ?? 0;

  validateNonNegativeFinite(gradientThreshold, "gradientThreshold");
  validateNonNegativeFinite(minCrackLengthPx, "minCrackLengthPx");
  validateNonNegativeFinite(maxAllowedDefects, "maxAllowedDefects");

  const { width, height } = image;
  const gradientMask = new Uint8Array(width * height);

  // 3x3 Sobel gradient magnitude. The 1-pixel border has no full
  // neighbourhood and is left at zero.
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      let gx = 0;
      let gy = 0;

      for (let ky = -1; ky <= 1; ky += 1) {
        for (let kx = -1; kx <= 1; kx += 1) {
          const kernelIndex = (ky + 1) * 3 + (kx + 1);
          const luma = image.data[(y + ky) * width + (x + kx)];
          gx += SOBEL_X[kernelIndex] * luma;
          gy += SOBEL_Y[kernelIndex] * luma;
        }
      }

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      gradientMask[y * width + x] = magnitude >= gradientThreshold ? 1 : 0;
    }
  }

  const skeleton = skeletonizeBinary(gradientMask, width, height);
  const components = labelConnectedComponents(skeleton, width, height);

  // Length per component: skeleton graph diameter (see the
  // approximation note above). Computed inline here, where the full
  // image width is in scope for indexing the skeleton.
  const defects: CrackDefect[] = [];

  for (const component of components) {
    const { x, y, width: boxWidth, height: boxHeight } = component.boundingBox;
    const pixels: Point[] = [];
    const indexByKey = new Map<string, number>();

    for (let py = y; py < y + boxHeight; py += 1) {
      for (let px = x; px < x + boxWidth; px += 1) {
        if (!skeleton[py * width + px]) {
          continue;
        }

        indexByKey.set(`${px},${py}`, pixels.length);
        pixels.push({ x: px, y: py });
      }
    }

    if (pixels.length === 0) {
      continue;
    }

    // Dijkstra over the 8-neighbour skeleton graph. Small helper, kept
    // local so it closes over `pixels` / `indexByKey` / `width` / `height`.
    const farthest = (start: number): { index: number; distance: number } => {
      const dist = new Array<number>(pixels.length).fill(Number.POSITIVE_INFINITY);
      const visited = new Array<boolean>(pixels.length).fill(false);
      dist[start] = 0;

      for (let step = 0; step < pixels.length; step += 1) {
        let current = -1;
        let best = Number.POSITIVE_INFINITY;

        for (let i = 0; i < pixels.length; i += 1) {
          if (!visited[i] && dist[i] < best) {
            best = dist[i];
            current = i;
          }
        }

        if (current === -1) {
          break;
        }

        visited[current] = true;

        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) {
              continue;
            }

            const neighbour = indexByKey.get(`${pixels[current].x + dx},${pixels[current].y + dy}`);

            if (neighbour === undefined) {
              continue;
            }

            const stepLength = dx === 0 || dy === 0 ? 1 : Math.SQRT2;
            const candidate = dist[current] + stepLength;

            if (candidate < dist[neighbour]) {
              dist[neighbour] = candidate;
            }
          }
        }
      }

      let farIndex = start;
      let farDistance = 0;

      for (let i = 0; i < pixels.length; i += 1) {
        if (dist[i] > farDistance) {
          farDistance = dist[i];
          farIndex = i;
        }
      }

      return { index: farIndex, distance: farDistance };
    };

    // Two-sweep diameter: farthest from an arbitrary pixel, then
    // farthest from that pixel. A single pixel has diameter 0, which
    // we report as length 1 (a 1 px defect).
    const crackLength = pixels.length === 1 ? 1 : Math.max(1, farthest(farthest(0).index).distance);

    if (crackLength >= minCrackLengthPx) {
      defects.push({ length: crackLength, boundingBox: component.boundingBox });
    }
  }

  defects.sort((a, b) => b.length - a.length);

  const maxCrackLengthPx = defects.length > 0 ? defects[0].length : 0;

  return {
    pass: defects.length <= maxAllowedDefects,
    defectCount: defects.length,
    maxCrackLengthPx,
    defects,
  };
}
