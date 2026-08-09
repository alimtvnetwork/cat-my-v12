/**
 * Plan 66 step 11 (RE-08): compile a Design Mode overlay to a full,
 * self-contained SVG document string. `pointsToAbsolutePath` already
 * emits a canonical path expressed in absolute commands, but exporting
 * a `.shape.svg` file for round-trip needs a real SVG document with a
 * root element, viewBox, and a `<path>` node the SVG importer
 * (`svg-import.ts`) can consume.
 *
 * The output shape:
 *
 *   <svg xmlns=... viewBox="minX minY w h" width=w height=h>
 *     <path d="M ... L ... Z" fill="none" stroke="black" stroke-width="1"/>
 *   </svg>
 *
 * Contract guarantees:
 * - Absolute-command path only (matches the server `normaliseSvgPath` regex).
 * - viewBox spans the shape's bounds with a 1px min per axis (via
 *   `boundsViewBox`).
 * - Round-trip: `parseImportedShape(compileDesignShape(pts).svg)` yields
 *   an `ImportedShape` whose `svgPath` is byte-equivalent (subject to
 *   3-decimal formatting) to the compiled path.
 */
import { boundsViewBox, pointsToAbsolutePath, simplify, type Point } from "./svg-path";

export interface CompiledDesignShape {
  /** Full SVG document string, ready for download or import. */
  svg: string;
  /** Path `d` attribute only. Same value that appears inside the SVG. */
  svgPath: string;
  viewBoxW: number;
  viewBoxH: number;
  /** Number of points after simplification. Useful for status readouts. */
  pointCount: number;
}

export interface CompileDesignShapeOptions {
  /**
   * Ramer-Douglas-Peucker epsilon in overlay units (0..1000). Zero
   * disables simplification. Default matches the overlay: 0.5.
   */
  simplifyEpsilon?: number;
  /** Whether to close the path with Z (fillable). Default true. */
  close?: boolean;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (ch) => {
    switch (ch) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      default:
        return ch;
    }
  });
}

export function compileDesignShape(
  points: readonly Point[],
  options: CompileDesignShapeOptions = {},
): CompiledDesignShape {
  const { simplifyEpsilon = 0.5, close = true } = options;
  const reduced =
    simplifyEpsilon > 0 && points.length >= 3 ? simplify(points, simplifyEpsilon) : points.slice();
  const svgPath = pointsToAbsolutePath(reduced, { close });
  const bounds = boundsViewBox(reduced);
  const viewBox = `${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${escapeXml(viewBox)}" ` +
    `width="${bounds.width}" height="${bounds.height}">` +
    `<path d="${escapeXml(svgPath)}" fill="none" stroke="black" stroke-width="1"/>` +
    `</svg>`;

  return {
    svg,
    svgPath,
    viewBoxW: bounds.width,
    viewBoxH: bounds.height,
    pointCount: reduced.length,
  };
}
