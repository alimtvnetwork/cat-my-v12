import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  drawRgbaToCanvas,
  toGrayscalePreviewRgba,
  type GrayscaleMode,
  STANDARD_CANVAS_WIDTH,
  STANDARD_CANVAS_HEIGHT,
} from "@/lib/vision/white-box-marking";
import { drawPatternBoxes, drawToleranceZones } from "./canvas-drawing";
import { canvasPointFromEvent, regionHandles, rotateHandlePoint } from "./pattern-geometry";
import { RoiToolbar } from "./RoiToolbar";
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
  /** Grayscale preview mode (spec 54 bits model). Defaults to threshold. */
  greyscaleMode?: GrayscaleMode;
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
  hasOverlays?: boolean;
  isSearchRegionLocked?: boolean;
  onSearchRegionLockChange?: (isLocked: boolean) => void;
  hiddenLayerIds?: ReadonlySet<string>;
  layerOrder?: readonly string[] | null;
  layerRotations?: Readonly<Record<string, number>>;
  onRegionRotationChange?: (layerId: string, degrees: number) => void;
  onBringLayerForward?: (layerId: string) => void;
  onSendLayerBackward?: (layerId: string) => void;
  onToggleLayerLock?: (layerId: string) => void;
  onToggleLayerVisibility?: (layerId: string) => void;
}

interface LayerContextMenu {
  x: number;
  y: number;
  layerId: string;
  layerLabel: string;
  isLocked: boolean;
}

interface RegionDrawSpec {
  id: string;
  region: SearchRegion;
  label: string;
  stroke: string;
  fill: string;
  text: string;
  hasHandles: boolean;
  hasRotateHandle: boolean;
  rotationDeg: number;
}

export function PatternCanvas(props: PatternCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [contextMenu, setContextMenu] = useState<LayerContextMenu | null>(null);
  const activeRegion = props.activeRegion ?? props.searchRegion ?? null;
  const regionEditMode = props.regionEditMode ?? "search";
  const isSearchRegionLocked = props.isSearchRegionLocked ?? false;
  const hiddenLayerIds = props.hiddenLayerIds ?? new Set<string>();
  const layerRotations = props.layerRotations ?? {};
  const isRotationEnabled = props.onRegionRotationChange !== undefined;

  const activeLayerId =
    regionEditMode === "mask" &&
    props.selectedMaskIndex !== null &&
    props.selectedMaskIndex !== undefined
      ? `mask-${props.selectedMaskIndex}`
      : regionEditMode === "pattern"
        ? "pattern"
        : "roi";
  const isActiveHidden = hiddenLayerIds.has(activeLayerId);
  const isLockedForDrag = (regionEditMode === "search" && isSearchRegionLocked) || isActiveHidden;

  const drag = useCanvasPointerDrag({
    source: props.source,
    searchRegion: activeRegion,
    dragState: props.dragState ?? null,
    onSearchRegionChange: (region) => props.onSearchRegionChange?.(region),
    onDragStateChange: (nextDrag) => props.onDragStateChange?.(nextDrag),
    isLocked: isLockedForDrag,
    isRotationEnabled,
    onRegionRotationChange: (degrees) => props.onRegionRotationChange?.(activeLayerId, degrees),
    // Spec 55: square ROI on creation and resize; a locked drag reports
    // itself instead of failing silently; pattern/mask regions are never
    // silently replaced by an outside click (search-mode ROI replacement
    // keeps its existing behavior).
    isSquareROI: true,
    isReplaceAllowed: regionEditMode === "search",
    onLockedDragAttempt: () => {
      toast("Search region is locked — double-click inside it or press Unlock to edit.", {
        id: "roi-locked-hint",
      });
    },
  });

  function handleDoubleClick(e: React.MouseEvent<HTMLCanvasElement>): void {
    if (isSearchRegionLocked === false || props.onSearchRegionLockChange === undefined) {
      return;
    }

    const region = props.searchRegion;

    if (region === null || region === undefined) {
      return;
    }

    const point = canvasPointFromEvent(e);
    const isInside =
      point.x >= region.x &&
      point.y >= region.y &&
      point.x <= region.x + region.width - 1 &&
      point.y <= region.y + region.height - 1;

    if (isInside) {
      props.onSearchRegionLockChange(false);
    }
  }

  function handleContextMenu(e: React.MouseEvent<HTMLCanvasElement>): void {
    e.preventDefault();

    const point = canvasPointFromEvent(e);

    // Hit-test topmost first: pattern boxes draw on top of every region
    // layer, so they are tested first; region layers follow in reverse
    // draw order (layerOrder bottom to top, reversed).
    for (let i = props.detectedBoxes.length - 1; i >= 0; i -= 1) {
      const box = props.detectedBoxes[i];

      if (
        point.x >= box.x &&
        point.y >= box.y &&
        point.x <= box.x + box.width - 1 &&
        point.y <= box.y + box.height - 1
      ) {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          layerId: `box-${box.number}`,
          layerLabel: `Pattern #${box.number}`,
          isLocked: false,
        });

        return;
      }
    }

    // Region layers, topmost first: same order they are drawn
    // (layerOrder bottom to top, reversed). Boxes were tested above.
    const patternRegion = props.patternRegion ?? props.formulatedPattern?.patternRegion ?? null;
    const regionCandidates: {
      id: string;
      label: string;
      region: SearchRegion;
      isLocked: boolean;
    }[] = [];

    if (props.searchRegion) {
      regionCandidates.push({
        id: "roi",
        label: "ROI — Search Region",
        region: props.searchRegion,
        isLocked: isSearchRegionLocked,
      });
    }

    if (patternRegion !== null) {
      regionCandidates.push({
        id: "pattern",
        label: "Pattern Region",
        region: patternRegion,
        isLocked: false,
      });
    }

    for (const [index, region] of (props.maskRegions ?? []).entries()) {
      regionCandidates.push({
        id: `mask-${index}`,
        label: `Mask ${index + 1}`,
        region,
        isLocked: false,
      });
    }

    sortByLayerOrder(regionCandidates, props.layerOrder ?? null);

    for (let i = regionCandidates.length - 1; i >= 0; i -= 1) {
      const candidate = regionCandidates[i];

      if (isPointInRegion(point, candidate.region)) {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          layerId: candidate.id,
          layerLabel: candidate.label,
          isLocked: candidate.isLocked,
        });

        return;
      }
    }

    setContextMenu(null);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const source = props.source;
    const isCleanBase = source !== null;
    const image = source
      ? {
          width: source.width,
          height: source.height,
          // The base image is always the mode-aware grayscale preview:
          // threshold keeps the legacy whiten-only behavior, stretch and
          // one-bit implement the spec 54 bits model. hasOverlays only
          // gates the overlay drawing below. Switching the base to raw
          // RGBA when overlays are off made the "Pattern Image" flip
          // between raw and thresholded, and broke the greyscale
          // slider's visible effect.
          rgba: toGrayscalePreviewRgba(
            source,
            props.greyscaleMode ?? "threshold",
            props.greyscaleLevel,
          ),
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

    if (props.hasOverlays === false) {
      return;
    }

    // Layer draw order, bottom to top: the ROI is the base layer, the
    // pattern region and masks sit above it, and the numbered pattern
    // boxes are the top layers. A caller-supplied layerOrder (bottom to
    // top) reorders the region layers; boxes always stay on top.
    const regionDraws: RegionDrawSpec[] = [];
    const activePatternRegion =
      props.patternRegion ?? props.formulatedPattern?.patternRegion ?? null;

    if (props.searchRegion && hiddenLayerIds.has("roi") === false) {
      regionDraws.push({
        id: "roi",
        region: props.searchRegion,
        label: isSearchRegionLocked ? "SEARCH REGION • LOCKED" : "SEARCH REGION",
        stroke:
          regionEditMode === "search" ? "rgba(250, 204, 21, 0.96)" : "rgba(250, 204, 21, 0.58)",
        fill: regionEditMode === "search" ? "rgba(250, 204, 21, 0.12)" : "rgba(250, 204, 21, 0.06)",
        text: "#fef08a",
        hasHandles: regionEditMode === "search" && isSearchRegionLocked === false,
        hasRotateHandle:
          regionEditMode === "search" && isSearchRegionLocked === false && isRotationEnabled,
        rotationDeg: layerRotations["roi"] ?? 0,
      });
    }

    if (activePatternRegion && hiddenLayerIds.has("pattern") === false) {
      regionDraws.push({
        id: "pattern",
        region: activePatternRegion,
        label: "PATTERN REGION",
        stroke:
          regionEditMode === "pattern" ? "rgba(239, 68, 68, 0.98)" : "rgba(239, 68, 68, 0.62)",
        fill: regionEditMode === "pattern" ? "rgba(239, 68, 68, 0.14)" : "rgba(239, 68, 68, 0.07)",
        text: "#fecaca",
        hasHandles: regionEditMode === "pattern",
        hasRotateHandle: regionEditMode === "pattern" && isRotationEnabled,
        rotationDeg: layerRotations["pattern"] ?? 0,
      });
    }

    for (const [index, region] of (props.maskRegions ?? []).entries()) {
      if (hiddenLayerIds.has(`mask-${index}`)) {
        continue;
      }

      const isSelected = regionEditMode === "mask" && props.selectedMaskIndex === index;

      regionDraws.push({
        id: `mask-${index}`,
        region,
        label: `MASK ${index + 1}`,
        stroke: isSelected ? "rgba(34, 197, 94, 1)" : "rgba(34, 197, 94, 0.62)",
        fill: isSelected ? "rgba(34, 197, 94, 0.14)" : "rgba(34, 197, 94, 0.07)",
        text: "#bbf7d0",
        hasHandles: isSelected,
        hasRotateHandle: isSelected && isRotationEnabled,
        rotationDeg: layerRotations[`mask-${index}`] ?? 0,
      });
    }

    sortByLayerOrder(regionDraws, props.layerOrder ?? null);

    for (const spec of regionDraws) {
      drawRotatedRegion(ctx, spec.region, spec.rotationDeg, () => {
        drawEditableRegion(ctx, spec.region, spec.label, {
          stroke: spec.stroke,
          fill: spec.fill,
          text: spec.text,
          hasHandles: spec.hasHandles,
          hasRotateHandle: spec.hasRotateHandle,
        });
      });
    }

    if (
      props.formulatedPattern &&
      props.formulatedPattern.toleranceZones.length > 0 &&
      isCleanBase
    ) {
      drawToleranceZones(ctx, props.formulatedPattern.toleranceZones);
    }

    if (props.detectedBoxes.length > 0 && isCleanBase) {
      const visibleBoxes = props.detectedBoxes.filter(
        (box) => hiddenLayerIds.has(`box-${box.number}`) === false,
      );

      drawPatternBoxes(ctx, visibleBoxes, props.excludedNumbers);
    }
  }, [
    props.result,
    props.source,
    props.greyscaleLevel,
    props.greyscaleMode,
    props.detectedBoxes,
    props.excludedNumbers,
    props.formulatedPattern,
    props.searchRegion,
    props.activeRegion,
    props.patternRegion,
    props.maskRegions,
    props.regionEditMode,
    props.selectedMaskIndex,
    props.hasOverlays,
    props.isSearchRegionLocked,
    props.hiddenLayerIds,
    props.layerOrder,
    props.layerRotations,
    regionEditMode,
  ]);

  // Box layers are not reorderable (they draw in number order): their
  // context menu must not offer Bring/Send buttons that silently no-op
  // in the parent. Region layers (roi, pattern, mask-N) keep them.
  const isContextMenuRegionLayer =
    contextMenu !== null &&
    (contextMenu.layerId === "roi" ||
      contextMenu.layerId === "pattern" ||
      contextMenu.layerId.startsWith("mask-"));

  // Toolbar region is the mode's own region, not the drag fallback:
  // in pattern/mask mode with no region yet there is nothing to attach
  // a toolbar to, and the search region must not wear a pattern label.
  const toolbarRegion =
    regionEditMode === "pattern"
      ? (props.patternRegion ?? props.formulatedPattern?.patternRegion ?? null)
      : regionEditMode === "mask"
        ? props.selectedMaskIndex === null || props.selectedMaskIndex === undefined
          ? null
          : (props.maskRegions?.[props.selectedMaskIndex] ?? null)
        : (props.searchRegion ?? null);

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-[#080b0f] select-none">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#242c35] bg-[#111820] px-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-ca-select shadow-[0_0_10px_rgba(0,255,157,0.7)]" />
          <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ca-ink">
            Pattern Image
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ca-ink-muted">
          Double-click locked ROI to unlock • Right-click a layer for order
        </span>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:32px_32px] p-6">
        <div className="relative aspect-video max-h-full max-w-full">
          <canvas
            ref={canvasRef}
            data-ui-id="ui-pattern-canvas"
            width={STANDARD_CANVAS_WIDTH}
            height={STANDARD_CANVAS_HEIGHT}
            onPointerDown={(e) => {
              setContextMenu(null);
              drag.handlePointerDown(e);
            }}
            onPointerMove={drag.handlePointerMove}
            onPointerUp={drag.handlePointerUp}
            onPointerCancel={drag.handlePointerUp}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
            className="block aspect-video max-h-full max-w-full cursor-crosshair rounded border border-[#4b5563] bg-black object-contain shadow-[0_18px_60px_rgba(0,0,0,0.45)]"
          />
          {isActiveHidden === false && (
            <RoiToolbar
              region={toolbarRegion}
              canvasWidth={STANDARD_CANVAS_WIDTH}
              canvasHeight={STANDARD_CANVAS_HEIGHT}
              label={
                regionEditMode === "pattern"
                  ? "PATTERN REGION"
                  : regionEditMode === "mask"
                    ? `MASK ${(props.selectedMaskIndex ?? 0) + 1}`
                    : isSearchRegionLocked
                      ? "SEARCH REGION • LOCKED"
                      : "SEARCH REGION"
              }
            >
              {regionEditMode === "search" && props.onSearchRegionLockChange !== undefined && (
                <button
                  type="button"
                  onClick={() => props.onSearchRegionLockChange?.(!isSearchRegionLocked)}
                  className="rounded bg-white/15 px-1.5 py-0.5 hover:bg-white/25"
                >
                  {isSearchRegionLocked ? "Unlock" : "Lock"}
                </button>
              )}
            </RoiToolbar>
          )}
        </div>
      </div>
      {contextMenu !== null && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            className="fixed z-50 min-w-[200px] rounded border border-[#3c4650] bg-[#111820] py-1 shadow-[0_18px_60px_rgba(0,0,0,0.6)]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="border-b border-[#242c35] px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ca-ink">
              {contextMenu.layerLabel}
            </div>
            {props.onBringLayerForward !== undefined && isContextMenuRegionLayer && (
              <button
                type="button"
                onClick={() => {
                  props.onBringLayerForward?.(contextMenu.layerId);
                  setContextMenu(null);
                }}
                className="block w-full px-3 py-1.5 text-left text-xs text-white hover:bg-[#2a3138]"
              >
                Bring Forward
              </button>
            )}
            {props.onSendLayerBackward !== undefined && isContextMenuRegionLayer && (
              <button
                type="button"
                onClick={() => {
                  props.onSendLayerBackward?.(contextMenu.layerId);
                  setContextMenu(null);
                }}
                className="block w-full px-3 py-1.5 text-left text-xs text-white hover:bg-[#2a3138]"
              >
                Send Backward
              </button>
            )}
            {props.onToggleLayerLock !== undefined && contextMenu.layerId === "roi" && (
              <button
                type="button"
                onClick={() => {
                  props.onToggleLayerLock?.(contextMenu.layerId);
                  setContextMenu(null);
                }}
                className="block w-full px-3 py-1.5 text-left text-xs text-white hover:bg-[#2a3138]"
              >
                {contextMenu.isLocked ? "Unlock Layer" : "Lock Layer"}
              </button>
            )}
            {props.onToggleLayerVisibility !== undefined && (
              <button
                type="button"
                onClick={() => {
                  props.onToggleLayerVisibility?.(contextMenu.layerId);
                  setContextMenu(null);
                }}
                className="block w-full px-3 py-1.5 text-left text-xs text-white hover:bg-[#2a3138]"
              >
                Hide Layer
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function sortByLayerOrder<T extends { id: string }>(
  items: T[],
  order: readonly string[] | null,
): void {
  if (order === null) {
    return;
  }

  items.sort((a, b) => {
    const aIndex = order.indexOf(a.id);
    const bIndex = order.indexOf(b.id);
    const aRank = aIndex === -1 ? Number.POSITIVE_INFINITY : aIndex;
    const bRank = bIndex === -1 ? Number.POSITIVE_INFINITY : bIndex;

    return aRank - bRank;
  });
}

function isPointInRegion(point: { x: number; y: number }, region: SearchRegion): boolean {
  return (
    point.x >= region.x &&
    point.y >= region.y &&
    point.x <= region.x + region.width - 1 &&
    point.y <= region.y + region.height - 1
  );
}

function drawRotatedRegion(
  ctx: CanvasRenderingContext2D,
  region: SearchRegion,
  rotationDeg: number,
  draw: () => void,
): void {
  if (rotationDeg === 0) {
    draw();

    return;
  }

  const cx = region.x + (region.width - 1) / 2;
  const cy = region.y + (region.height - 1) / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.translate(-cx, -cy);
  draw();
  ctx.restore();
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
  tone: {
    stroke: string;
    fill: string;
    text: string;
    hasHandles: boolean;
    hasRotateHandle: boolean;
  },
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

  if (tone.hasRotateHandle) {
    const rotatePoint = rotateHandlePoint(region);
    const xm = Math.round((region.x + region.x + region.width - 1) / 2);

    ctx.strokeStyle = tone.stroke;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(xm, region.y);
    ctx.lineTo(rotatePoint.x, rotatePoint.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rotatePoint.x, rotatePoint.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = tone.stroke;
    ctx.fill();
    ctx.strokeStyle = "#0f172a";
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
  ctx.fillRect(region.x, Math.max(0, region.y - 18), Math.max(94, label.length * 7), 16);
  ctx.fillStyle = tone.text;
  ctx.font = "bold 10px monospace";
  ctx.fillText(label, region.x + 6, Math.max(11, region.y - 6));
  ctx.restore();
}
