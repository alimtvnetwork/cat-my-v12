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
  WhiteBoxRegionShape,
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
  patternRegion?: SearchRegion | null;
  maskRegions?: readonly SearchRegion[];
  regionEditMode?: PatternRegionEditMode;
  selectedMaskIndex?: number | null;
  dragState?: RegionDrag | null;
  onSearchRegionChange?: (region: SearchRegion | null) => void;
  onDragStateChange?: (drag: RegionDrag | null) => void;
  // Toolbar plumbing (optional; absent = standalone canvas, unchanged behavior):
  // viewZoom is the toolbar zoom percent (clamped 5-800 here); viewModes
  // gates region/result/grid layers (defaults preserve today's drawing:
  // regions + results on, grid on). regionShape + onRegionShapeChange
  // render the RECT/SQUA/CIRC/POLY buttons in the header; absent = no buttons.
  viewZoom?: number;
  viewModes?: { regions: boolean; results: boolean; grid: boolean };
  regionShape?: WhiteBoxRegionShape;
  onRegionShapeChange?: (shape: WhiteBoxRegionShape) => void;
}

export function PatternCanvas(props: PatternCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeRegion = props.activeRegion ?? props.searchRegion ?? null;
  const regionEditMode = props.regionEditMode ?? "search";
  // Toolbar plumbing: zoom is a display size only (see the canvas style
  // below); viewModes gate the drawn layers; shape buttons select the
  // outline of the region being edited. Defaults preserve today's drawing.
  const zoomPercent = Math.max(5, Math.min(800, props.viewZoom ?? 100));
  const zoomFactor = zoomPercent / 100;
  const isZoomed = zoomFactor !== 1;
  const showRegions = props.viewModes?.regions ?? true;
  const showResults = props.viewModes?.results ?? true;
  const showGrid = props.viewModes?.grid ?? true;
  const activeShape = props.regionShape ?? "rect";
  const shapeLabels: Record<WhiteBoxRegionShape, string> = {
    rect: "RECT",
    square: "SQUA",
    circle: "CIRC",
    poly: "POLY",
  };
  const shapeTitles: Record<WhiteBoxRegionShape, string> = {
    rect: "Rectangle outline",
    square: "Square outline (display only; bounding box unchanged)",
    circle: "Ellipse outline inscribed in the bounding box",
    poly: "Polygon outline through the bounding-box corners",
  };
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

    // Working-space render: this canvas shows the 960x540 working buffer,
    // not canonical space. Region coordinates drawn here are working-space
    // coordinates; map them through the recorded transform (spec 01 §4.1)
    // before treating them as canonical geometry.
    drawRgbaToCanvas(canvas, STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT, image.rgba);

    if (
      props.formulatedPattern &&
      props.formulatedPattern.toleranceZones.length > 0 &&
      isCleanBase &&
      showResults
    ) {
      drawToleranceZones(ctx, props.formulatedPattern.toleranceZones);
    }

    if (props.detectedBoxes.length > 0 && isCleanBase && showResults) {
      drawPatternBoxes(ctx, props.detectedBoxes, props.excludedNumbers);
    }

    const activePatternRegion = props.patternRegion ?? props.formulatedPattern?.patternRegion ?? null;
    const visiblePatternRegion = showRegions ? activePatternRegion : null;

    if (visiblePatternRegion) {
      drawEditableRegion(ctx, visiblePatternRegion, "PATTERN REGION", {
        stroke:
          regionEditMode === "pattern"
            ? "rgba(239, 68, 68, 0.98)"
            : "rgba(239, 68, 68, 0.62)",
        fill:
          regionEditMode === "pattern"
            ? "rgba(239, 68, 68, 0.14)"
            : "rgba(239, 68, 68, 0.07)",
        text: "#fecaca",
        hasHandles: regionEditMode === "pattern",
      }, visiblePatternRegion.shape ?? "rect");
    }

    for (const [index, region] of (showRegions ? (props.maskRegions ?? []) : []).entries()) {
      const isSelected = regionEditMode === "mask" && props.selectedMaskIndex === index;

      drawEditableRegion(ctx, region, `MASK ${index + 1}`, {
        stroke: isSelected ? "rgba(34, 197, 94, 1)" : "rgba(34, 197, 94, 0.62)",
        fill: isSelected ? "rgba(34, 197, 94, 0.14)" : "rgba(34, 197, 94, 0.07)",
        text: "#bbf7d0",
        hasHandles: isSelected,
      }, region.shape ?? "rect");
    }

    if (props.searchRegion && showRegions) {
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
      }, props.searchRegion.shape ?? "rect");
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
    props.patternRegion,
    props.maskRegions,
    props.regionEditMode,
    props.selectedMaskIndex,
    props.viewModes,
  ]);

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-[#080b0f] select-none">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#242c35] bg-[#111820] px-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-ca-select shadow-[0_0_10px_rgba(0,255,157,0.7)]" />
          <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ca-ink">
            Pattern Image
          </span>
        </div>
        <div className="flex items-center gap-2">
          {props.onRegionShapeChange ? (
            <div className="flex items-center gap-1" role="group" aria-label="Region shape">
              {(["rect", "square", "circle", "poly"] as const).map((shape) => (
                <button
                  key={shape}
                  type="button"
                  onClick={() => props.onRegionShapeChange?.(shape)}
                  className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                    activeShape === shape
                      ? "border-ca-select bg-ca-select/15 text-ca-ink"
                      : "border-[#2a3138] text-ca-ink-muted hover:text-ca-ink"
                  }`}
                  title={shapeTitles[shape]}
                >
                  {shapeLabels[shape]}
                </button>
              ))}
            </div>
          ) : null}
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ca-ink-muted">
            Drag ROI handles to tune
          </span>
        </div>
      </div>
      <div
        className={`flex min-h-0 flex-1 items-center justify-center overflow-auto p-6 ${
          showGrid
            ? "bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:32px_32px]"
            : ""
        }`}
      >
        <canvas
          ref={canvasRef}
          width={STANDARD_CANVAS_WIDTH}
          height={STANDARD_CANVAS_HEIGHT}
          onPointerDown={drag.handlePointerDown}
          onPointerMove={drag.handlePointerMove}
          onPointerUp={drag.handlePointerUp}
          onPointerCancel={drag.handlePointerUp}
          // Zoom is display size only, never a transform: the backing store
          // stays 960x540, so canvasPointFromEvent — which maps through
          // getBoundingClientRect — keeps returning exact buffer
          // coordinates at any zoom. No pan: the wrapper scrolls.
          style={
            isZoomed
              ? {
                  width: `${STANDARD_CANVAS_WIDTH * zoomFactor}px`,
                  height: `${STANDARD_CANVAS_HEIGHT * zoomFactor}px`,
                  maxWidth: "none",
                  maxHeight: "none",
                }
              : undefined
          }
          className="aspect-video max-h-full max-w-full cursor-crosshair rounded border border-[#4b5563] bg-black object-contain shadow-[0_18px_60px_rgba(0,0,0,0.45)]"
        />
      </div>
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
  shape: WhiteBoxRegionShape = "rect",
): void {
  ctx.save();
  ctx.strokeStyle = tone.stroke;
  ctx.fillStyle = tone.fill;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);

  // Shape changes only the drawn outline. Handles always sit on the
  // bounding-rect corners and edit the bounding rect; evaluation uses
  // the rect geometry (the backend reduces shapes to bounding boxes).
  // This is display shape, not square enforcement: no region is forced square.
  if (shape === "square") {
    const side = Math.min(region.width, region.height);
    const squareX = region.x + (region.width - side) / 2;
    const squareY = region.y + (region.height - side) / 2;

    ctx.fillRect(squareX, squareY, side, side);
    ctx.strokeRect(squareX, squareY, side, side);
  } else if (shape === "circle") {
    ctx.beginPath();
    ctx.ellipse(
      region.x + region.width / 2,
      region.y + region.height / 2,
      region.width / 2,
      region.height / 2,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
  } else if (shape === "poly") {
    ctx.beginPath();
    ctx.moveTo(region.x, region.y);
    ctx.lineTo(region.x + region.width, region.y);
    ctx.lineTo(region.x + region.width, region.y + region.height);
    ctx.lineTo(region.x, region.y + region.height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Vertex dots distinguish the polygon outline from the plain rect.
    for (const corner of [
      { x: region.x, y: region.y },
      { x: region.x + region.width, y: region.y },
      { x: region.x + region.width, y: region.y + region.height },
      { x: region.x, y: region.y + region.height },
    ]) {
      ctx.fillStyle = tone.stroke;
      ctx.fillRect(corner.x - 3, corner.y - 3, 6, 6);
    }
  } else {
    ctx.fillRect(region.x, region.y, region.width, region.height);
    ctx.strokeRect(region.x, region.y, region.width, region.height);
  }

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
