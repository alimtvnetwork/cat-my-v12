import React, { useEffect, useRef } from "react";
import type { SearchRegion, WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";
import type { RegionDrag } from "@/components/vision/white-box/types";
import { regionHandles } from "@/components/vision/white-box/pattern-geometry";
import { useCanvasPointerDrag } from "@/components/vision/white-box/useCanvasPointerDrag";
import {
  STANDARD_CANVAS_HEIGHT,
  STANDARD_CANVAS_WIDTH,
} from "@/components/vision/standard/tools/pattern-matching/usePatternMatchingRule";

export interface StandardWorkbenchCanvasProps {
  source: WhiteBoxMarkingInput | null;
  searchRegion: SearchRegion | null;
  dragState: RegionDrag | null;
  hasFilteredPreview: boolean;
  hasOverlays: boolean;
  filterModeLabel?: string;
  toolBadge?: string;
  statusText?: string;
  isPass?: boolean;
  onSearchRegionChange: (region: SearchRegion | null) => void;
  onDragStateChange: (drag: RegionDrag | null) => void;
  onToggleFilteredPreview: () => void;
  onResetRegion?: () => void;
  createFilteredImageData?: (source: WhiteBoxMarkingInput) => ImageData;
  renderCustomOverlays?: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

export function StandardWorkbenchCanvas(props: StandardWorkbenchCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const drag = useCanvasPointerDrag({
    source: props.source,
    searchRegion: props.searchRegion,
    dragState: props.dragState,
    onSearchRegionChange: props.onSearchRegionChange,
    onDragStateChange: props.onDragStateChange,
  });

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    const canvasWidth = STANDARD_CANVAS_WIDTH;
    const canvasHeight = STANDARD_CANVAS_HEIGHT;

    // 1. Stage background
    ctx.fillStyle = "#0a0d12";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Industrial grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;

    for (let x = 0; x < canvasWidth; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }

    for (let y = 0; y < canvasHeight; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }

    // 3. Render Workpiece Image
    if (!props.source) {
      ctx.save();
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No workpiece image loaded.", canvasWidth / 2, canvasHeight / 2 - 12);
      ctx.font = "11px sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText(
        "Upload an image or start Live Camera below to calibrate.",
        canvasWidth / 2,
        canvasHeight / 2 + 12,
      );
      ctx.restore();

      return;
    }

    const offscreen = document.createElement("canvas");
    offscreen.width = props.source.width;
    offscreen.height = props.source.height;
    const offCtx = offscreen.getContext("2d");

    if (offCtx) {
      if (props.hasFilteredPreview && props.createFilteredImageData) {
        const filtered = props.createFilteredImageData(props.source);
        offCtx.putImageData(filtered, 0, 0);
      } else {
        const imgData = offCtx.createImageData(props.source.width, props.source.height);
        imgData.data.set(props.source.rgba);
        offCtx.putImageData(imgData, 0, 0);
      }

      ctx.drawImage(offscreen, 0, 0, canvasWidth, canvasHeight);
    }

    // 4. Custom tool algorithm overlays
    if (props.hasOverlays && props.renderCustomOverlays) {
      props.renderCustomOverlays(ctx, canvasWidth, canvasHeight);
    }

    // 5. Draw active Inspection Region ROI
    if (props.hasOverlays && props.searchRegion) {
      const region = props.searchRegion;
      const strokeColor = "#00f0ff";

      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = "rgba(0, 240, 255, 0.08)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);

      ctx.fillRect(region.x, region.y, region.width, region.height);
      ctx.strokeRect(region.x, region.y, region.width, region.height);
      ctx.setLineDash([]);

      // Region Tag
      ctx.fillStyle = strokeColor;
      ctx.font = "bold 10px monospace";
      ctx.fillText(
        `INSPECTION ROI [${region.width}x${region.height}]`,
        region.x + 4,
        Math.max(14, region.y - 6),
      );

      // 8 Resize Handles
      for (const handle of regionHandles(region)) {
        ctx.fillStyle = strokeColor;
        ctx.fillRect(handle.x - 4, handle.y - 4, 8, 8);
        ctx.strokeStyle = "#080b0f";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(handle.x - 4, handle.y - 4, 8, 8);
      }

      ctx.restore();
    }
  }, [
    props.source,
    props.searchRegion,
    props.hasFilteredPreview,
    props.hasOverlays,
    props.createFilteredImageData,
    props.renderCustomOverlays,
  ]);

  return (
    <div className="relative flex h-full w-full min-h-0 flex-col overflow-hidden bg-[#0a0d12]">
      {/* Top Floating Controls */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={props.onToggleFilteredPreview}
          className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-bold uppercase transition-all shadow-md ${
            props.hasFilteredPreview
              ? "border-[#00ff9d] bg-[#00ff9d]/20 text-[#00ff9d] shadow-[0_0_12px_rgba(0,255,157,0.2)]"
              : "border-[#3c4650] bg-[#161b22]/90 text-slate-300 hover:bg-[#21262d]"
          }`}
        >
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              props.hasFilteredPreview ? "bg-[#00ff9d] animate-pulse" : "bg-slate-500"
            }`}
          />
          {props.hasFilteredPreview
            ? props.filterModeLabel ?? "FILTERED (Algorithm Mask)"
            : "RAW (RGB Image)"}
        </button>

        {props.onResetRegion && (
          <button
            type="button"
            onClick={props.onResetRegion}
            className="rounded border border-[#3c4650] bg-[#161b22]/90 px-2.5 py-1.5 text-xs font-semibold text-slate-300 shadow-sm hover:bg-[#21262d] hover:text-white"
          >
            Reset ROI
          </button>
        )}
      </div>

      {/* Top-Right HUD Badge */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {props.toolBadge && (
          <span className="rounded border border-[#3c4650] bg-[#161b22]/90 px-2.5 py-1 text-[11px] font-mono font-bold text-cyan-300 shadow-sm">
            {props.toolBadge}
          </span>
        )}

        {props.statusText && (
          <span
            className={`rounded border px-2.5 py-1 text-[11px] font-mono font-bold uppercase shadow-sm ${
              props.isPass
                ? "border-emerald-500/50 bg-emerald-950/80 text-emerald-300"
                : "border-rose-500/50 bg-rose-950/80 text-rose-300"
            }`}
          >
            {props.statusText}
          </span>
        )}
      </div>

      {/* Main Interactive Canvas */}
      <div className="flex h-full w-full items-center justify-center p-2">
        <canvas
          ref={canvasRef}
          width={STANDARD_CANVAS_WIDTH}
          height={STANDARD_CANVAS_HEIGHT}
          onPointerDown={drag.handlePointerDown}
          onPointerMove={drag.handlePointerMove}
          onPointerUp={drag.handlePointerUp}
          className="aspect-video h-full max-h-full w-full max-w-full rounded border border-[#1e2630] object-contain shadow-2xl cursor-crosshair touch-none"
        />
      </div>
    </div>
  );
}
