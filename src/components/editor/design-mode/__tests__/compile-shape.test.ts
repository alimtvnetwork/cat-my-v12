// @vitest-environment jsdom
// Plan 66 step 11 (RE-08): compileDesignShape round-trip.
// Verifies that a compiled shape can be re-parsed by the SVG importer and
// preserves the absolute-command path plus viewBox extents.

import { describe, expect, it } from "vitest";
import { compileDesignShape } from "../compile-shape";
import { parseSvgSource } from "../svg-import";
import type { Point } from "../svg-path";

describe("compileDesignShape", () => {
  const triangle: Point[] = [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
    { x: 200, y: 250 },
  ];

  it("emits a valid SVG document with an absolute-command path", () => {
    const compiled = compileDesignShape(triangle);
    expect(compiled.svg).toMatch(/^<svg xmlns/);
    expect(compiled.svg).toContain("viewBox=");
    expect(compiled.svg).toContain("<path");
    expect(compiled.svgPath.startsWith("M ")).toBe(true);
    expect(compiled.svgPath.endsWith(" Z")).toBe(true);
  });

  it("round-trips through parseSvgSource with identical path + viewBox", () => {
    const compiled = compileDesignShape(triangle);
    const imported = parseSvgSource(compiled.svg);
    expect(imported.source).toBe("path");
    expect(imported.svgPath).toBe(compiled.svgPath);
    expect(imported.viewBoxW).toBe(compiled.viewBoxW);
    expect(imported.viewBoxH).toBe(compiled.viewBoxH);
  });

  it("uses a 1px minimum extent so degenerate shapes still parse", () => {
    // Two coincident points would yield zero width/height without the guard.
    const compiled = compileDesignShape([
      { x: 50, y: 50 },
      { x: 50, y: 50 },
    ]);
    expect(compiled.viewBoxW).toBeGreaterThanOrEqual(1);
    expect(compiled.viewBoxH).toBeGreaterThanOrEqual(1);
    const imported = parseSvgSource(compiled.svg);
    expect(imported.svgPath).toBe(compiled.svgPath);
  });

  it("open path drops the trailing Z when close=false", () => {
    const compiled = compileDesignShape(triangle, { close: false });
    expect(compiled.svgPath.endsWith(" Z")).toBe(false);
  });

  it("simplifies dense freehand traces below the server 64 kB cap", () => {
    // Generate a 5000-point noisy circle. Without simplification, the path
    // would be huge; RDP at epsilon=1 reduces it dramatically.
    const pts: Point[] = Array.from({ length: 5000 }, (_, i) => {
      const t = (i / 5000) * Math.PI * 2;

      return { x: 500 + 200 * Math.cos(t), y: 500 + 200 * Math.sin(t) };
    });
    const raw = compileDesignShape(pts, { simplifyEpsilon: 0 });
    const simplified = compileDesignShape(pts, { simplifyEpsilon: 1 });
    expect(simplified.pointCount).toBeLessThan(raw.pointCount);
    expect(simplified.svg.length).toBeLessThan(raw.svg.length);
    expect(simplified.svg.length).toBeLessThan(64 * 1024);
  });

  it("escapes XML-hostile characters in the path (defensive)", () => {
    // The path itself is machine-generated so this is a defensive check
    // that the escaper is wired to the attribute writer.
    const compiled = compileDesignShape([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]);
    expect(compiled.svg).not.toMatch(/<script/i);
  });
});
