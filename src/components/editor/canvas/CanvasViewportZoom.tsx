import React from "react";
import {
  DEFAULT_ALIGN_TOLERANCE_PX,
  MAX_ALIGN_TOLERANCE_PX,
  MIN_ALIGN_TOLERANCE_PX,
} from "@/lib/editor/snap";
import {
  setSnapEnabled,
  setSnapAlignTolerance,
  setSnapDebug,
  setSnapShowGuides,
  useSnap,
} from "@/lib/editor/snap-store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";

export interface CanvasViewportZoomProps {
  zoom: number;
  onStepZoom: (delta: number) => void;
  onResetZoom: () => void;
}

export function CanvasViewportZoom({
  zoom,
  onStepZoom,
  onResetZoom,
}: CanvasViewportZoomProps): React.JSX.Element | null {
  const snap = useSnap();

  return (
    <div className="editor-canvas-hud editor-canvas-zoom">
      <button
        type="button"
        onClick={() => onStepZoom(-100)}
        className="editor-canvas-zoom-btn"
        aria-label="Zoom out"
        title="Zoom out"
      >
        −
      </button>
      <button
        type="button"
        onClick={onResetZoom}
        className="editor-canvas-zoom-btn editor-canvas-zoom-reset"
        aria-label="Reset zoom to 100%"
        title="Reset zoom to 100% (fit view)"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        onClick={() => onStepZoom(100)}
        className="editor-canvas-zoom-btn"
        aria-label="Zoom in"
        title="Zoom in"
      >
        +
      </button>
      <button
        type="button"
        onClick={() => setSnapEnabled(!snap.enabled)}
        className="editor-canvas-zoom-btn"
        aria-pressed={snap.enabled}
        aria-label={snap.enabled ? "Snap to grid: on" : "Snap to grid: off"}
        title={`Snap to grid (Ctrl/Cmd+;) - ${snap.enabled ? "on" : "off"}, ${snap.gridPx}px`}
        data-testid="canvas-snap-toggle"
        style={{
          color: snap.enabled ? "var(--hmi-color-accent, currentColor)" : undefined,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {snap.enabled ? `⋮⋮ ${snap.gridPx}` : "⋮⋮"}
      </button>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="editor-canvas-zoom-btn"
            aria-label={`Alignment snap threshold: ${snap.alignTolerancePx ?? DEFAULT_ALIGN_TOLERANCE_PX}px`}
            title={`Alignment snap threshold: ${snap.alignTolerancePx ?? DEFAULT_ALIGN_TOLERANCE_PX}px (screen)`}
            data-testid="canvas-snap-threshold-trigger"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {`◎ ${snap.alignTolerancePx ?? DEFAULT_ALIGN_TOLERANCE_PX}px`}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          className="w-64 space-y-2"
          data-testid="canvas-snap-threshold-popover"
        >
          <div className="flex items-baseline justify-between">
            <label htmlFor="canvas-snap-threshold-slider" className="text-xs font-medium">
              Snap threshold
            </label>
            <span
              className="text-xs text-muted-foreground"
              style={{ fontVariantNumeric: "tabular-nums" }}
              data-testid="canvas-snap-threshold-value"
            >
              {snap.alignTolerancePx ?? DEFAULT_ALIGN_TOLERANCE_PX}px
            </span>
          </div>
          <Slider
            id="canvas-snap-threshold-slider"
            data-testid="canvas-snap-threshold-slider"
            min={MIN_ALIGN_TOLERANCE_PX}
            max={MAX_ALIGN_TOLERANCE_PX}
            step={1}
            value={[snap.alignTolerancePx ?? DEFAULT_ALIGN_TOLERANCE_PX]}
            onValueChange={(v) => setSnapAlignTolerance(v[0] ?? DEFAULT_ALIGN_TOLERANCE_PX)}
            aria-label="Snap threshold in screen pixels"
          />
          <p className="text-[11px] leading-snug text-muted-foreground">
            Screen-space band around alignment guides. Higher values snap ROI edges more
            aggressively; lower values require finer aim.
          </p>
          <label className="flex cursor-pointer items-center justify-between gap-2 rounded-sm px-1 py-1 text-xs hover:bg-muted/40">
            <span className="flex flex-col">
              <span className="font-medium">Show guides</span>
              <span className="text-[10px] text-muted-foreground">
                Draw alignment lines while dragging or resizing.
              </span>
            </span>
            <input
              type="checkbox"
              checked={snap.showGuides !== false}
              onChange={(e) => setSnapShowGuides(e.currentTarget.checked)}
              data-testid="canvas-snap-show-guides-toggle"
              aria-label="Show alignment guides"
              className="h-3.5 w-3.5"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-2 rounded-sm px-1 py-1 text-xs hover:bg-muted/40">
            <span className="flex flex-col">
              <span className="font-medium">Debug overlay</span>
              <span className="text-[10px] text-muted-foreground">
                Show snap distances and selected guides while dragging.
              </span>
            </span>
            <input
              type="checkbox"
              checked={!!snap.debug}
              onChange={(e) => setSnapDebug(e.currentTarget.checked)}
              data-testid="canvas-snap-debug-toggle"
              aria-label="Show snap debug overlay"
              className="h-3.5 w-3.5"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
              onClick={() => setSnapAlignTolerance(DEFAULT_ALIGN_TOLERANCE_PX)}
              data-testid="canvas-snap-threshold-reset"
            >
              Reset to {DEFAULT_ALIGN_TOLERANCE_PX}px
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
