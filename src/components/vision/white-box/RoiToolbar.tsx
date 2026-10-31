import type { ReactNode } from "react";

export interface RoiToolbarRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoiToolbarProps {
  region: RoiToolbarRegion | null;
  canvasWidth: number;
  canvasHeight: number;
  label: string;
  children?: ReactNode;
}

/**
 * Toolbar anchored to a canvas region (spec 55: pattern search toolbar
 * and icons must render inside/attached to the ROI surface). Positions
 * in percent of the canvas so it tracks the region exactly at any
 * display size. The bar sits just above the region's top edge, falling
 * back inside the region when it starts near the top edge. The
 * container is pointer-events-none so it never blocks canvas drags;
 * buttons inside re-enable pointer events.
 */
export function RoiToolbar(props: RoiToolbarProps): ReactNode {
  if (props.region === null || props.canvasWidth <= 0 || props.canvasHeight <= 0) {
    return null;
  }

  const leftPct = (props.region.x / props.canvasWidth) * 100;
  const aboveTopPct = ((props.region.y - 30) / props.canvasHeight) * 100;
  const insideTopPct = (props.region.y / props.canvasHeight) * 100;
  const topPct = props.region.y >= 30 ? aboveTopPct : insideTopPct;

  return (
    <div
      className="pointer-events-none absolute z-20 flex items-center gap-1 rounded bg-black/70 px-1.5 py-1 text-[11px] text-white"
      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
      data-testid="roi-toolbar"
    >
      <span className="font-medium whitespace-nowrap">
        {props.label} • {props.region.width}×{props.region.height}
      </span>

      <span className="pointer-events-auto flex items-center gap-1">{props.children}</span>
    </div>
  );
}
