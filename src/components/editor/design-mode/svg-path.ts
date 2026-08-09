/**
 * Design Mode SVG path helpers, Plan 64 step 90.
 *
 * Root cause for a dedicated module: the overlay needs to convert
 * user-drawn points into a canonical SVG path expressed exclusively
 * with absolute commands, matching the `normaliseSvgPath` regex on
 * the server (see `src/lib/shapes.server.ts`). Doing this inline in
 * the component would drift.
 */
export interface Point {
  x: number;
  y: number;
}

/** Round to 3 decimals to stay under the server precision cap. */
function fmt(n: number): string {
  return Number.isFinite(n) ? Number(n.toFixed(3)).toString() : "0";
}

/**
 * Options for {@link pointsToAbsolutePath}. Named to avoid positional
 * boolean flags at call sites (Plan 43 slice 3, command 21).
 */
export interface PointsToPathOptions {
  /** Append `Z` so the shape can be filled and masked. */
  close: boolean;
}

/**
 * Build an absolute-command SVG path from a list of points.
 */
export function pointsToAbsolutePath(
  points: readonly Point[],
  options: PointsToPathOptions,
): string {
  const { close } = options;

  if (points.length === 0) return "";
  const [first, ...rest] = points;
  const head = `M ${fmt(first.x)} ${fmt(first.y)}`;
  const tail = rest.map((p) => `L ${fmt(p.x)} ${fmt(p.y)}`).join(" ");
  const path = tail ? `${head} ${tail}` : head;

  return close && points.length >= 3 ? `${path} Z` : path;
}

/**
 * Compute an axis-aligned bounding box for a point cloud. Returns a
 * viewBox with a 1px minimum on each axis so downstream renderers
 * never divide by zero.
 */
export function boundsViewBox(points: readonly Point[]): {
  minX: number;
  minY: number;
  width: number;
  height: number;
} {
  if (points.length === 0) return { minX: 0, minY: 0, width: 1, height: 1 };
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;
  for (const p of points) {
    if (p.x < minX) minX = p.x;

    if (p.y < minY) minY = p.y;

    if (p.x > maxX) maxX = p.x;

    if (p.y > maxY) maxY = p.y;
  }

  return {
    minX,
    minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

/**
 * Ramer-Douglas-Peucker simplification, used to collapse dense
 * freehand traces before compile. Keeps the polygon visually close
 * while trimming payload size (the server caps SVG path at 64 kB).
 */
export function simplify(points: readonly Point[], epsilon: number): Point[] {
  if (points.length < 3 || epsilon <= 0) return points.slice();
  const first = points[0];
  const last = points[points.length - 1];
  let maxDist = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const d = perpendicularDistance(points[i], first, last);

    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplify(points.slice(0, index + 1), epsilon);
    const right = simplify(points.slice(index), epsilon);

    return left.slice(0, -1).concat(right);
  }

  return [first, last];
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  if (dx === 0 && dy === 0) {
    const ex = p.x - a.x;
    const ey = p.y - a.y;

    return Math.hypot(ex, ey);
  }

  const num = Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x);
  const den = Math.hypot(dx, dy);

  return num / den;
}
