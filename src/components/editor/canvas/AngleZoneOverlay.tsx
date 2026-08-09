/**
 * Acceptance-zone overlay for rotation.
 *
 * Renders an SVG pie-slice (arc + two radial edges) at the ROI centre
 * spanning [angleMin, angleMax]. Shown while the user is actively
 * rotating or resizing a rectangular ROI so the safe rotation range
 * is visible in-canvas rather than buried in the Properties palette.
 *
 * All angles are degrees, clockwise from +X (screen up = -90°),
 * matching `computeRotation` / `normalizeAngle` in
 * `src/lib/editor/rotation.ts`. `theta` is the current rotation, used
 * only to draw the "current heading" tick inside the zone.
 */
import { normalizeAngle } from "@/lib/editor/rotation";

export interface AngleZoneOverlayProps {
  /** ROI centre in overlay-local pixels. */
  cx: number;
  cy: number;
  /** Zone radius in overlay pixels. Caller typically feeds max(halfW, halfH) + pad. */
  radius: number;
  angleMin: number;
  angleMax: number;
  /** Current rotation angle (deg). Optional; draws a heading tick when finite. */
  theta?: number;
  /** Slightly stronger visuals while the user is at a bound. */
  atBound?: boolean;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;

  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function AngleZoneOverlay({
  cx,
  cy,
  radius,
  angleMin,
  angleMax,
  theta,
  atBound,
}: AngleZoneOverlayProps) {
  const lo = normalizeAngle(angleMin);
  const hi = normalizeAngle(angleMax);
  // Skip degenerate/inverted zones. The rotation seam already ignores
  // (min > max) pairs so we do the same here for visual parity.
  if (Number.isFinite(lo) === false || Number.isFinite(hi) === false || lo >= hi) return null;
  const r = Math.max(24, radius);
  const a = polar(cx, cy, r, lo);
  const b = polar(cx, cy, r, hi);
  const large = hi - lo > 180 ? 1 : 0;
  const path = `M ${cx} ${cy} L ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y} Z`;
  const fill = atBound ? "hsl(var(--destructive) / 0.18)" : "hsl(var(--primary) / 0.12)";
  const stroke = atBound ? "hsl(var(--destructive))" : "hsl(var(--primary))";
  const tick = Number.isFinite(theta) ? polar(cx, cy, r, theta as number) : null;

  return (
    <svg
      data-testid="rule-angle-zone"
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-visible"
      style={{ width: "100%", height: "100%" }}
    >
      <path d={path} fill={fill} stroke={stroke} strokeWidth={1} strokeDasharray="4 3" />
      {/* radial edges emphasised so the bounds read cleanly */}
      <line x1={cx} y1={cy} x2={a.x} y2={a.y} stroke={stroke} strokeWidth={1.5} />
      <line x1={cx} y1={cy} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={1.5} />
      {tick ? (
        <line
          x1={cx}
          y1={cy}
          x2={tick.x}
          y2={tick.y}
          stroke={atBound ? "hsl(var(--destructive))" : "hsl(var(--foreground))"}
          strokeWidth={2}
        />
      ) : null}
      {/* min/max labels */}
      <text
        x={a.x}
        y={a.y}
        dx={6}
        dy={-4}
        className="fill-foreground"
        style={{ font: "600 11px ui-sans-serif, system-ui", paintOrder: "stroke" }}
        stroke="hsl(var(--background))"
        strokeWidth={3}
      >
        {lo.toFixed(0)}°
      </text>
      <text
        x={b.x}
        y={b.y}
        dx={6}
        dy={-4}
        className="fill-foreground"
        style={{ font: "600 11px ui-sans-serif, system-ui", paintOrder: "stroke" }}
        stroke="hsl(var(--background))"
        strokeWidth={3}
      >
        {hi.toFixed(0)}°
      </text>
    </svg>
  );
}
