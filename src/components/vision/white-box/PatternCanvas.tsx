import { useEffect, useRef } from "react";
import {
  drawRgbaToCanvas,
  toThresholdPreviewRgba,
  STANDARD_CANVAS_WIDTH,
  STANDARD_CANVAS_HEIGHT,
} from "@/lib/vision/white-box-marking";
import { drawPatternBoxes, drawToleranceZones } from "./canvas-drawing";
import { regionHandles } from "./pattern-geometry";
import { useCanvasPointerDrag } from "./useCanvasPointerDrag";
import type {
  FormulatedPatternGeometry,
  RegionDrag,
  SearchRegion,
  WhiteBoxMark,
  WhiteBoxMarkingInput,
  WhiteBoxMarkingResult,
  PatternRegionEditMode,
} from "./types";

export interface PatternCanvasProps {
  source: WhiteBoxMarkingInput | null;
  result: WhiteBoxMarkingResult | null;
  greyscaleLevel: number;
  detectedBoxes: readonly WhiteBoxMark[];
  excludedNumbers: ReadonlySet<number>;
  formulatedPattern: FormulatedPatternGeometry | null;
  searchRegion?: SearchRegion | null;
  activeRegion?: SearchRegion | null;
  maskRegions?: readonly SearchRegion[];
  regionEditMode?: PatternRegionEditMode;
  selectedMaskIndex?: number | null;
  dragState?: RegionDrag | null;
  onSearchRegionChange?: (region: SearchRegion | null) => void;
  onDragStateChange?: (drag: RegionDrag | null) => void;
}

export function PatternCanvas(props: PatternCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeRegion = props.activeRegion ?? props.searchRegion ?? null;
  const regionEditMode = props.regionEditMode ?? "search";
  const drag = useCanvasPointerDrag({
    source: props.source,
    searchRegion: activeRegion,
    dragState: props.dragState ?? null,
    onSearchRegionChange: (region) => props.onSearchRegionChange?.(region),
    onDragStateChange: (nextDrag) => props.onDragStateChange?.(nextDrag),
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const source = props.source;
    const isCleanBase = source !== null;
    const image = source
      ? {
          width: source.width,
          height: source.height,
          rgba: toThresholdPreviewRgba(source, props.greyscaleLevel),
        }
      : props.result;

    if (canvas === null) {
      return;
    }

    const ctx = canvas.getContext("2d");

    if (ctx === null) {
      return;
    }

    if (image === null) {
      // Clean empty state with zero preloaded image
      ctx.fillStyle = "#12151b";
      ctx.fillRect(0, 0, STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "No workpiece image loaded.",
        STANDARD_CANVAS_WIDTH / 2,
        STANDARD_CANVAS_HEIGHT / 2 - 10,
      );

      ctx.font = "11px sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText(
        "Upload an image or start Live Camera above to calibrate pattern.",
        STANDARD_CANVAS_WIDTH / 2,
        STANDARD_CANVAS_HEIGHT / 2 + 12,
      );

      return;
    }

    drawRgbaToCanvas(canvas, STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT, image.rgba);

    if (
      props.formulatedPattern &&
      props.formulatedPattern.toleranceZones.length > 0 &&
      isCleanBase
    ) {
      drawToleranceZones(ctx, props.formulatedPattern.toleranceZones);
    }

    if (props.detectedBoxes.length > 0 && isCleanBase) {
      drawPatternBoxes(ctx, props.detectedBoxes, props.excludedNumbers);
    }

    if (props.formulatedPattern) {
      drawReadOnlyRegion(ctx, props.formulatedPattern.patternRegion, "PATTERN REGION", {
        stroke: "rgba(239, 68, 68, 0.92)",
        fill: "rgba(239, 68, 68, 0.08)",
        text: "#fecaca",
      });
    }

    for (const [index, region] of (props.maskRegions ?? []).entries()) {
      const isSelected = regionEditMode === "mask" && props.selectedMaskIndex === index;

      drawEditableRegion(ctx, region, `MASK ${index + 1}`, {
        stroke: isSelected ? "rgba(34, 197, 94, 1)" : "rgba(34, 197, 94, 0.62)",
        fill: isSelected ? "rgba(34, 197, 94, 0.14)" : "rgba(34, 197, 94, 0.07)",
        text: "#bbf7d0",
        hasHandles: isSelected,
      });
    }

    if (props.searchRegion) {
      drawEditableRegion(ctx, props.searchRegion, "SEARCH REGION", {
        stroke:
          regionEditMode === "search"
            ? "rgba(250, 204, 21, 0.96)"
            : "rgba(250, 204, 21, 0.58)",
        fill:
          regionEditMode === "search"
            ? "rgba(250, 204, 21, 0.12)"
            : "rgba(250, 204, 21, 0.06)",
        text: "#fef08a",
        hasHandles: regionEditMode === "search",
      });
    }
  }, [
    props.result,
    props.source,
    props.greyscaleLevel,
    props.detectedBoxes,
    props.excludedNumbers,
    props.formulatedPattern,
    props.searchRegion,
    props.activeRegion,
    props.maskRegions,
    props.regionEditMode,
    props.selectedMaskIndex,
  ]);

  return (
    <div className="flex h-full flex-1 items-center justify-center overflow-auto border-r border-ca-border bg-ca-bg p-3 select-none">
      <canvas
        ref={canvasRef}
        width={STANDARD_CANVAS_WIDTH}
        height={STANDARD_CANVAS_HEIGHT}
        onPointerDown={drag.handlePointerDown}
        onPointerMove={drag.handlePointerMove}
        onPointerUp={drag.handlePointerUp}
        onPointerCancel={drag.handlePointerUp}
        className="aspect-video max-h-full max-w-full cursor-crosshair rounded border border-ca-border bg-black object-contain shadow-md"
      />
    </div>
  );
}

function drawReadOnlyRegion(
  ctx: CanvasRenderingContext2D,
  region: SearchRegion,
  label: string,
  tone: { stroke: string; fill: string; text: string },
): void {
  ctx.save();
  ctx.strokeStyle = tone.stroke;
  ctx.fillStyle = tone.fill;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 3]);
  ctx.fillRect(region.x, region.y, region.width, region.height);
  ctx.strokeRect(region.x, region.y, region.width, region.height);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
  ctx.fillRect(region.x, Math.max(0, region.y - 18), Math.max(94, label.length * 7), 16);
  ctx.fillStyle = tone.text;
  ctx.font = "bold 10px monospace";
  ctx.fillText(label, region.x + 6, Math.max(11, region.y - 6));
  ctx.restore();
}

function drawEditableRegion(
  ctx: CanvasRenderingContext2D,
  region: SearchRegion,
  label: string,
  tone: { stroke: string; fill: string; text: string; hasHandles: boolean },
): void {
  ctx.save();
  ctx.strokeStyle = tone.stroke;
  ctx.fillStyle = tone.fill;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.fillRect(region.x, region.y, region.width, region.height);
  ctx.strokeRect(region.x, region.y, region.width, region.height);
  ctx.setLineDash([]);
  ctx.fillStyle = tone.stroke;

  if (tone.hasHandles) {
    for (const handle of regionHandles(region)) {
      ctx.fillRect(handle.x - 4, handle.y - 4, 8, 8);
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1;
      ctx.strokeRect(handle.x - 4, handle.y - 4, 8, 8);
    }
  }

  ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
  ctx.fillRect(region.x, Math.max(0, region.y - 18), Math.max(94, label.length * 7), 16);
  ctx.fillStyle = tone.text;
  ctx.font = "bold 10px monospace";
  ctx.fillText(label, region.x + 6, Math.max(11, region.y - 6));
  ctx.restore();
}
