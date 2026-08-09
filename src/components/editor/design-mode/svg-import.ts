/**
 * SVG import parser, Plan 64 step 69.
 *
 * Root cause for a dedicated module: the ruleset editor needs to
 * accept operator-supplied `.svg` files and turn them into a canonical
 * absolute-command path that matches `normaliseSvgPath` on the server
 * (`src/lib/shapes.server.ts`). Doing this inline in the route file
 * would drift and would not be testable.
 *
 * Supported source shapes, in preference order:
 *   1. `<path d="...">`, taken as-is after absolute-only validation.
 *   2. `<polygon points="x,y x,y ...">`, converted to `M ... L ... Z`.
 *   3. `<polyline points="x,y x,y ...">`, converted to `M ... L ...`.
 *   4. `<rect x y width height>`, converted to a 4-point polygon.
 *
 * Anything else, including relative commands or curve commands the
 * server does not accept, raises an explicit error. Silent fallback
 * would produce a shape that renders locally but fails to compile.
 */
import { pointsToAbsolutePath, type Point } from "./svg-path";
import { type EditorRect } from "@/lib/editor/types";
import { LayerSourceType } from "@/lib/enums/editor";

export interface ImportedShape {
  svgPath: string;
  viewBoxW: number;
  viewBoxH: number;
  source: LayerSourceType;
}

const ABSOLUTE_ONLY = /^[MLHVCSQTAZ0-9.\-,\s]+$/;

function parseViewBox(root: Element): { w: number; h: number } {
  const raw = root.getAttribute("viewBox");

  if (raw) {
    const parts = raw.split(/[\s,]+/).map((n) => Number.parseFloat(n));

    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const w = parts[2];
      const h = parts[3];

      if (w > 0 && h > 0) return { w, h };
    }
  }

  const w = Number.parseFloat(root.getAttribute("width") ?? "");
  const h = Number.parseFloat(root.getAttribute("height") ?? "");

  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return { w, h };

  return { w: 1000, h: 1000 };
}

function parsePointsAttr(raw: string | null): Point[] {
  if (!raw) return [];
  const nums = raw
    .split(/[\s,]+/)
    .map((n) => Number.parseFloat(n))
    .filter((n) => Number.isFinite(n));
  const out: Point[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    out.push({ x: nums[i], y: nums[i + 1] });
  }

  return out;
}

export function parseSvgSource(source: string): ImportedShape {
  if (typeof DOMParser === "undefined") {
    throw new Error("SVG import requires a browser DOM (DOMParser unavailable).");
  }

  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  const parserError = doc.querySelector("parsererror");

  if (parserError) {
    throw new Error(`SVG could not be parsed: ${parserError.textContent?.trim() ?? "unknown"}.`);
  }

  const root = doc.documentElement;

  if (!root || root.tagName.toLowerCase() !== "svg") {
    throw new Error("Root element is not <svg>.");
  }

  const { w, h } = parseViewBox(root);

  const path = root.querySelector("path[d]");

  if (path) {
    const d = (path.getAttribute("d") ?? "").trim();

    if (!d) throw new Error("<path> has an empty `d` attribute.");

    if (ABSOLUTE_ONLY.test(d) === false) {
      throw new Error(
        "<path> uses relative or unsupported commands. Only absolute commands (M L H V C S Q T A Z) are accepted.",
      );
    }

    return { svgPath: d, viewBoxW: w, viewBoxH: h, source: LayerSourceType.Path };
  }

  const polygon = root.querySelector("polygon[points]");

  if (polygon) {
    const pts = parsePointsAttr(polygon.getAttribute("points"));

    if (pts.length < 3) throw new Error("<polygon> needs at least 3 points.");

    return {
      svgPath: pointsToAbsolutePath(pts, { close: true }),
      viewBoxW: w,
      viewBoxH: h,
      source: LayerSourceType.Polygon,
    };
  }

  const polyline = root.querySelector("polyline[points]");

  if (polyline) {
    const pts = parsePointsAttr(polyline.getAttribute("points"));

    if (pts.length < 2) throw new Error("<polyline> needs at least 2 points.");

    return {
      svgPath: pointsToAbsolutePath(pts, { close: false }),
      viewBoxW: w,
      viewBoxH: h,
      source: LayerSourceType.Polyline,
    };
  }

  const rect = root.querySelector("rect");

  if (rect) {
    const rx = Number.parseFloat(rect.getAttribute("x") ?? "0");
    const ry = Number.parseFloat(rect.getAttribute("y") ?? "0");
    const rw = Number.parseFloat(rect.getAttribute("width") ?? "0");
    const rh = Number.parseFloat(rect.getAttribute("height") ?? "0");

    if ([rx, ry, rw, rh].every((n) => Number.isFinite(n)) === false || rw <= 0 || rh <= 0) {
      throw new Error("<rect> is missing valid x, y, width, height.");
    }

    const pts: Point[] = [
      { x: rx, y: ry },
      { x: rx + rw, y: ry },
      { x: rx + rw, y: ry + rh },
      { x: rx, y: ry + rh },
    ];

    return {
      svgPath: pointsToAbsolutePath(pts, { close: true }),
      viewBoxW: w,
      viewBoxH: h,
      source: LayerSourceType.Rect,
    };
  }

  throw new Error("SVG has no <path d>, <polygon>, <polyline>, or <rect>. Nothing to import.");
}
