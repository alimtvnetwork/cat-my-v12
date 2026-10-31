import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  GrayscaleMode,
  SearchRegion,
  WhiteBoxMarkingInput,
} from "@/lib/vision/white-box-marking";
import {
  getPatternShapePoints,
  isPointInPatternShape,
  tracePatternShapePath,
} from "@/lib/vision/white-box-marking";
import { ShapeType } from "@/domain/vision/shapes";
import type { RegionDrag } from "@/components/vision/white-box/types";
import { regionHandles } from "@/components/vision/white-box/pattern-geometry";
import { RoiToolbar } from "@/components/vision/white-box/RoiToolbar";
import { useCanvasPointerDrag } from "@/components/vision/white-box/useCanvasPointerDrag";
import {
  STANDARD_CANVAS_HEIGHT,
  STANDARD_CANVAS_WIDTH,
} from "@/components/vision/standard/tools/pattern-matching/usePatternMatchingRule";
import {
  HolePolarityType,
  type Pin1HoleItem,
  type Pin1MatchResult,
  type Pin1RegionEditMode,
  type Pin1ShapeType,
} from "./types";

export interface Pin1CanvasProps {
  source: WhiteBoxMarkingInput | null;
  searchRegion: SearchRegion | null;
  packageRegion: SearchRegion | null;
  activeRegion: SearchRegion | null;
  regionEditMode: Pin1RegionEditMode;
  shapeType?: Pin1ShapeType;
  detectedHoles: readonly Pin1HoleItem[];
  registeredPin1: Pin1HoleItem | null;
  matchResult: Pin1MatchResult | null;
  hasOverlays: boolean;
  hasGreyscalePreview?: boolean;
  thresholdLuma?: number;
  polarity?: HolePolarityType;
  /** Grayscale preview mode (spec 54 bits model). Defaults to threshold. */
  greyscaleMode?: GrayscaleMode;
  /** Pattern shape searched inside the ROI (spec 54). Defaults to Rectangle. */
  patternShape?: ShapeType;
  /** ROI lock state, controlled by the parent when provided (spec 54 §22
   *  follow-up: panel lock buttons drive the canvas). Defaults to locked. */
  isSearchLocked?: boolean;
  onSearchLockChange?: (isLocked: boolean) => void;
  /** Search/package draw order, bottom to top, controlled by the parent
   *  when provided (panel reorder buttons drive the canvas). */
  layerOrder?: readonly ("search" | "package")[];
  onLayerOrderChange?: (order: readonly ("search" | "package")[]) => void;
  dragState: RegionDrag | null;
  onSearchRegionChange: (region: SearchRegion | null) => void;
  onDragStateChange: (drag: RegionDrag | null) => void;
  onSelectHole?: (id: number) => void;
  onRegisterPoint?: (point: { x: number; y: number }) => void;
}

function createThresholdPreview(
  source: WhiteBoxMarkingInput,
  threshold = 128,
  polarity = HolePolarityType.DarkIndentation,
  mode: GrayscaleMode = "threshold",
): ImageData {
  const output = new ImageData(source.width, source.height);
  const data = output.data;
  const raw = source.rgba;
  const totalPixels = source.width * source.height;

  // Stretch needs the frame's luma range first (darkest -> 0, brightest
  // -> 255); threshold/one-bit compare against raw luma.
  let minLuma = 255;
  let maxLuma = 0;

  if (mode === "stretch") {
    for (let i = 0; i < totalPixels; i += 1) {
      const idx = i * 4;
      const luma = Math.round(0.299 * raw[idx] + 0.587 * raw[idx + 1] + 0.114 * raw[idx + 2]);

      if (luma < minLuma) minLuma = luma;
      if (luma > maxLuma) maxLuma = luma;
    }
  }

  const stretchScale = maxLuma > minLuma ? 255 / (maxLuma - minLuma) : 1;

  for (let i = 0; i < totalPixels; i += 1) {
    const idx = i * 4;
    let luma = Math.round(0.299 * raw[idx] + 0.587 * raw[idx + 1] + 0.114 * raw[idx + 2]);

    if (mode === "stretch" && maxLuma > minLuma) {
      luma = Math.min(255, Math.max(0, Math.round((luma - minLuma) * stretchScale)));
    }

    const isTarget =
      polarity === HolePolarityType.DarkIndentation ? luma <= threshold : luma >= threshold;

    // Threshold keeps the legacy behavior (target bright white, the rest
    // continuous greyscale); one-bit reduces everything to pure 0/255.
    const val = mode === "one-bit" ? (isTarget ? 255 : 0) : isTarget ? 255 : luma;
    data[idx] = val;
    data[idx + 1] = val;
    data[idx + 2] = val;
    data[idx + 3] = 255;
  }

  return output;
}

export function Pin1Canvas(props: Pin1CanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Clicking the pattern shape selects it (hit-tested, spec 54). Selection
  // never consumes the event: the drag still runs, so region move/resize
  // behavior is unchanged.
  const [isPatternShapeSelected, setPatternShapeSelected] = useState(false);
  // ROI lock + layer order (spec 54, mirroring the white-box canvas):
  // the search region (ROI) is locked by default — selection-only, no
  // move/resize, no replacement on outside click — until double-clicked
  // inside it. Right-click reorders the search/package layers. The lock
  // only engages once a region exists, so first creation is never blocked.
  // The parent (Pin1MarkingTool) may control both values so the
  // LayersPanel buttons drive the same state; otherwise internal state
  // is used, preserving the standalone-canvas behavior.
  const [internalSearchLocked, setInternalSearchLocked] = useState(true);
  const isSearchLocked = props.isSearchLocked ?? internalSearchLocked;

  function setIsSearchLocked(next: boolean): void {
    if (props.onSearchLockChange !== undefined) {
      props.onSearchLockChange(next);
    } else {
      setInternalSearchLocked(next);
    }
  }

  const [internalLayerOrder, setInternalLayerOrder] = useState<readonly ("search" | "package")[]>([
    "search",
    "package",
  ]);
  const layerOrder = props.layerOrder ?? internalLayerOrder;

  function setLayerOrder(next: readonly ("search" | "package")[]): void {
    if (props.onLayerOrderChange !== undefined) {
      props.onLayerOrderChange(next);
    } else {
      setInternalLayerOrder(next);
    }
  }
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    layerId: "search" | "package";
    layerLabel: string;
    isLocked: boolean;
  } | null>(null);
  const drag = useCanvasPointerDrag({
    source: props.source,
    searchRegion: props.activeRegion,
    dragState: props.dragState,
    onSearchRegionChange: props.onSearchRegionChange,
    onDragStateChange: props.onDragStateChange,
    isLocked: props.regionEditMode === "search" && isSearchLocked,
    // Spec 55: square ROI on creation and resize; a locked drag reports
    // itself instead of failing silently; package-region outside-click
    // never silently replaces (search-mode ROI behavior preserved).
    isSquareROI: true,
    isReplaceAllowed: props.regionEditMode === "search",
    onLockedDragAttempt: () => {
      toast("Search region is locked — double-click inside it or press Unlock to edit.", {
        id: "pin1-roi-locked-hint",
      });
    },
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
    ctx.fillStyle = "#12151b";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Subtle stage grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
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

    // 3. Render Image (Normal RGB or 2-bit Binarized preview)
    if (!props.source) {
      ctx.save();
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No workpiece image loaded.", canvasWidth / 2, canvasHeight / 2 - 10);
      ctx.font = "11px sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText(
        "Upload an image or start Live Camera above to detect Pin 1 hole.",
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
      if (props.hasGreyscalePreview) {
        const binData = createThresholdPreview(
          props.source,
          props.thresholdLuma ?? 128,
          props.polarity ?? HolePolarityType.DarkIndentation,
          props.greyscaleMode ?? "threshold",
        );
        offCtx.putImageData(binData, 0, 0);
      } else {
        const imgData = offCtx.createImageData(props.source.width, props.source.height);
        imgData.data.set(props.source.rgba);
        offCtx.putImageData(imgData, 0, 0);
      }

      ctx.drawImage(offscreen, 0, 0, canvasWidth, canvasHeight);
    }

    if (!props.hasOverlays) {
      return;
    }

    // Layer draw order follows layerOrder (bottom to top); right-click
    // Bring Forward / Send Backward swaps the two region layers.
    for (const layerId of layerOrder) {
      if (layerId === "search" && props.searchRegion) {
        drawRegion(ctx, {
          region: props.searchRegion,
          label: isSearchLocked ? "SEARCH REGION • LOCKED" : "SEARCH REGION",
          color: "#facc15",
          isActive: props.regionEditMode === "search",
          showHandles: props.regionEditMode === "search" && !isSearchLocked,
        });
      }

      if (layerId === "package" && props.packageRegion) {
        drawRegion(ctx, {
          region: props.packageRegion,
          label: "PACKAGE REGION",
          color: "#38bdf8",
          isActive: props.regionEditMode === "package",
          showHandles: props.regionEditMode === "package",
        });
      }
    }

    // 4b. Pattern shape overlay (spec 54): the shape searched INSIDE the
    // ROI, drawn inscribed in the search region. Rectangle needs no
    // overlay — the region rect already is the shape.
    if (props.searchRegion && props.patternShape && props.patternShape !== ShapeType.Rectangle) {
      drawPatternShapeOverlay(ctx, {
        region: props.searchRegion,
        shape: props.patternShape,
        isSelected: isPatternShapeSelected,
      });
    }

    // 5. Render Registered Pin 1 Target Reticle (if inspecting)
    if (props.registeredPin1) {
      const reg = props.registeredPin1;
      ctx.save();
      ctx.strokeStyle = "rgba(234, 179, 8, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(reg.centerX, reg.centerY, reg.radius + 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(234, 179, 8, 0.9)";
      ctx.font = "bold 9px monospace";
      ctx.fillText("REF PIN 1", reg.centerX - 24, Math.max(12, reg.centerY - reg.radius - 6));
      ctx.restore();
    }

    // 6. Render Detected Circular Hole(s)
    for (const hole of props.detectedHoles) {
      ctx.save();

      const hasRule = Boolean(props.registeredPin1);
      const isMatchedActiveHole = props.matchResult?.activeHole?.id === hole.id;
      const isPass = props.matchResult?.isPass ?? false;
      const isPrimary = hasRule ? isMatchedActiveHole && isPass : hole.isPrimaryPin1 && hole.isKept;

      const strokeColor = !hole.isKept
        ? "rgba(244, 63, 94, 0.45)"
        : hasRule
          ? isMatchedActiveHole
            ? isPass
              ? "#10b981"
              : "#f43f5e"
            : "#06b6d4"
          : isPrimary
            ? "#10b981"
            : "#06b6d4";

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);

      ctx.beginPath();
      if (props.shapeType === "rectangle") {
        const rw = hole.radius * 2.2;
        const rh = hole.radius * 1.6;
        ctx.strokeRect(hole.centerX - rw / 2, hole.centerY - rh / 2, rw, rh);
      } else if (props.shapeType === "square") {
        const side = hole.radius * 2;
        ctx.strokeRect(hole.centerX - side / 2, hole.centerY - side / 2, side, side);
      } else if (props.shapeType === "ring") {
        ctx.arc(hole.centerX, hole.centerY, hole.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(hole.centerX, hole.centerY, Math.max(2, hole.radius * 0.55), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.arc(hole.centerX, hole.centerY, hole.radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Crosshair
      ctx.beginPath();
      ctx.moveTo(hole.centerX - 5, hole.centerY);
      ctx.lineTo(hole.centerX + 5, hole.centerY);
      ctx.moveTo(hole.centerX, hole.centerY - 5);
      ctx.lineTo(hole.centerX, hole.centerY + 5);
      ctx.stroke();

      // Badge
      const labelText = !hole.isKept
        ? `[EXCLUDED #${hole.id}]`
        : hasRule
          ? isMatchedActiveHole
            ? isPass
              ? `PIN 1 PASS [${hole.circularity}%]`
              : `PIN 1 OFFSET [Δ=${props.matchResult?.deltaDistance ?? 0}px]`
            : `#${hole.id} [${hole.circularity}%]`
          : isPrimary
            ? `PIN 1 [R=${hole.radius} ${hole.circularity}%]`
            : `#${hole.id} [${hole.circularity}%]`;

      ctx.font = "bold 9px monospace";
      const textMetrics = ctx.measureText(labelText);
      const textW = textMetrics.width + 8;
      const badgeX = hole.centerX + hole.radius + 6;
      const badgeY = hole.centerY - 7;

      const isBadgeSuccess = !hasRule ? isPrimary : isMatchedActiveHole && isPass;
      const isBadgeError = hasRule && isMatchedActiveHole && !isPass;

      ctx.fillStyle = isBadgeSuccess
        ? "rgba(16, 185, 129, 0.9)"
        : isBadgeError
          ? "rgba(244, 63, 94, 0.9)"
          : !hole.isKept
            ? "rgba(15, 23, 42, 0.75)"
            : "rgba(15, 23, 42, 0.85)";

      ctx.fillRect(badgeX, badgeY, textW, 14);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(badgeX, badgeY, textW, 14);

      ctx.fillStyle = isBadgeSuccess || isBadgeError ? "#ffffff" : "#e2e8f0";
      ctx.fillText(labelText, badgeX + 4, badgeY + 10);

      ctx.restore();
    }
  }, [
    props.source,
    props.searchRegion,
    props.packageRegion,
    props.regionEditMode,
    props.detectedHoles,
    props.registeredPin1,
    props.matchResult,
    props.hasOverlays,
    props.hasGreyscalePreview,
    props.thresholdLuma,
    props.polarity,
    props.greyscaleMode,
    props.patternShape,
    isPatternShapeSelected,
    isSearchLocked,
    layerOrder,
  ]);

  return (
    <div className="flex h-full flex-1 items-center justify-center overflow-auto border-r border-ca-border bg-ca-bg p-3 select-none">
      <div className="relative aspect-video max-h-full max-w-full">
        <canvas
          ref={canvasRef}
          data-ui-id="ui-pin1-canvas"
          width={STANDARD_CANVAS_WIDTH}
          height={STANDARD_CANVAS_HEIGHT}
          onPointerDown={(event) => {
            setContextMenu(null);

            if (selectHoleAtPoint(event, props, canvasRef.current)) {
              return;
            }

            if (
              props.regionEditMode === "pin" &&
              registerPointAtEvent(event, props, canvasRef.current)
            ) {
              return;
            }

            selectPatternShapeAtEvent(event, props, canvasRef.current, setPatternShapeSelected);

            drag.handlePointerDown(event);
          }}
          onPointerMove={drag.handlePointerMove}
          onPointerUp={drag.handlePointerUp}
          onPointerCancel={drag.handlePointerUp}
          onDoubleClick={(event) => {
            if (!isSearchLocked || !props.searchRegion || canvasRef.current === null) {
              return;
            }

            const point = canvasPointFromPin1Event(event, canvasRef.current);

            if (point === null) {
              return;
            }

            const region = props.searchRegion;

            if (
              point.x >= region.x &&
              point.y >= region.y &&
              point.x <= region.x + region.width - 1 &&
              point.y <= region.y + region.height - 1
            ) {
              setIsSearchLocked(false);
            }
          }}
          onContextMenu={(event) => {
            event.preventDefault();

            if (canvasRef.current === null) {
              return;
            }

            const point = canvasPointFromPin1Event(event, canvasRef.current);

            if (point === null) {
              return;
            }

            // Hit-test topmost first (reverse draw order).
            for (let i = layerOrder.length - 1; i >= 0; i -= 1) {
              const layerId = layerOrder[i];
              const region = layerId === "search" ? props.searchRegion : props.packageRegion;

              if (
                region !== null &&
                region !== undefined &&
                point.x >= region.x &&
                point.y >= region.y &&
                point.x <= region.x + region.width - 1 &&
                point.y <= region.y + region.height - 1
              ) {
                setContextMenu({
                  x: event.clientX,
                  y: event.clientY,
                  layerId,
                  layerLabel: layerId === "search" ? "ROI — Search Region" : "Package Region",
                  isLocked: layerId === "search" && isSearchLocked,
                });

                return;
              }
            }

            setContextMenu(null);
          }}
          className="block aspect-video max-h-full max-w-full cursor-crosshair rounded border border-ca-border bg-black object-contain shadow-md"
        />
        <RoiToolbar
          region={
            props.regionEditMode === "package"
              ? props.packageRegion
              : props.regionEditMode === "search"
                ? props.searchRegion
                : null
          }
          canvasWidth={STANDARD_CANVAS_WIDTH}
          canvasHeight={STANDARD_CANVAS_HEIGHT}
          label={
            props.regionEditMode === "package"
              ? "PACKAGE REGION"
              : isSearchLocked
                ? "SEARCH REGION • LOCKED"
                : "SEARCH REGION"
          }
        >
          {props.regionEditMode === "search" && (
            <button
              type="button"
              onClick={() => setIsSearchLocked(!isSearchLocked)}
              className="rounded bg-white/15 px-1.5 py-0.5 hover:bg-white/25"
            >
              {isSearchLocked ? "Unlock" : "Lock"}
            </button>
          )}
        </RoiToolbar>
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
            <button
              type="button"
              onClick={() => {
                movePin1Layer(contextMenu.layerId, 1, layerOrder, setLayerOrder);
                setContextMenu(null);
              }}
              className="block w-full px-3 py-1.5 text-left text-xs text-white hover:bg-[#2a3138]"
            >
              Bring Forward
            </button>
            <button
              type="button"
              onClick={() => {
                movePin1Layer(contextMenu.layerId, -1, layerOrder, setLayerOrder);
                setContextMenu(null);
              }}
              className="block w-full px-3 py-1.5 text-left text-xs text-white hover:bg-[#2a3138]"
            >
              Send Backward
            </button>
            {contextMenu.layerId === "search" && (
              <button
                type="button"
                onClick={() => {
                  setIsSearchLocked(!contextMenu.isLocked);
                  setContextMenu(null);
                }}
                className="block w-full px-3 py-1.5 text-left text-xs text-white hover:bg-[#2a3138]"
              >
                {contextMenu.isLocked ? "Unlock ROI" : "Lock ROI"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function canvasPointFromPin1Event(
  event: React.MouseEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
): { x: number; y: number } | null {
  const rect = canvas.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

export function movePin1Layer(
  layerId: "search" | "package",
  delta: 1 | -1,
  layerOrder: readonly ("search" | "package")[],
  setLayerOrder: (order: readonly ("search" | "package")[]) => void,
): void {
  const index = layerOrder.indexOf(layerId);
  const target = index + delta;

  if (index < 0 || target < 0 || target >= layerOrder.length) {
    return;
  }

  const next = [...layerOrder];
  next[index] = layerOrder[target];
  next[target] = layerId;
  setLayerOrder(next);
}

function registerPointAtEvent(
  event: React.PointerEvent<HTMLCanvasElement>,
  props: Pin1CanvasProps,
  canvas: HTMLCanvasElement | null,
): boolean {
  if (!props.onRegisterPoint || canvas === null) {
    return false;
  }

  const rect = canvas.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = Math.round((event.clientX - rect.left) * scaleX);
  const y = Math.round((event.clientY - rect.top) * scaleY);

  props.onRegisterPoint({ x, y });

  return true;
}

function selectHoleAtPoint(
  event: React.PointerEvent<HTMLCanvasElement>,
  props: Pin1CanvasProps,
  canvas: HTMLCanvasElement | null,
): boolean {
  if (!props.onSelectHole || props.detectedHoles.length === 0 || canvas === null) {
    return false;
  }

  const rect = canvas.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clickX = (event.clientX - rect.left) * scaleX;
  const clickY = (event.clientY - rect.top) * scaleY;

  for (const hole of props.detectedHoles) {
    const dist = Math.hypot(hole.centerX - clickX, hole.centerY - clickY);

    if (dist <= Math.max(16, hole.radius + 6)) {
      props.onSelectHole(hole.id);

      return true;
    }
  }

  return false;
}

function drawPatternShapeOverlay(
  ctx: CanvasRenderingContext2D,
  params: {
    region: SearchRegion;
    shape: ShapeType;
    isSelected: boolean;
  },
): void {
  const { region, shape, isSelected } = params;
  const shapedRegion: SearchRegion = { ...region, shape };

  ctx.save();
  ctx.strokeStyle = "#e879f9";
  ctx.fillStyle = "#e879f9";
  ctx.lineWidth = isSelected ? 3 : 2;
  ctx.setLineDash([6, 4]);
  tracePatternShapePath(ctx, shapedRegion);
  ctx.stroke();
  ctx.setLineDash([]);

  // Polygon vertices get markers so the shape reads as editable points.
  if (shape === ShapeType.Polygon) {
    for (const point of getPatternShapePoints(shapedRegion)) {
      ctx.fillRect(point.x - 3, point.y - 3, 6, 6);
    }
  }

  const label = `PATTERN SHAPE: ${shape.toUpperCase()}`;
  const labelWidth = Math.max(120, ctx.measureText(label).width + 14);
  ctx.fillStyle = isSelected ? "rgba(232, 121, 249, 0.95)" : "rgba(15, 23, 42, 0.82)";
  ctx.fillRect(region.x, Math.max(0, region.y - 18), labelWidth, 16);
  ctx.fillStyle = isSelected ? "#0f172a" : "#e879f9";
  ctx.font = "bold 10px monospace";
  ctx.fillText(label, region.x + 6, Math.max(11, region.y - 6));
  ctx.restore();
}

function selectPatternShapeAtEvent(
  event: React.PointerEvent<HTMLCanvasElement>,
  props: Pin1CanvasProps,
  canvas: HTMLCanvasElement | null,
  setSelected: (isSelected: boolean) => void,
): void {
  const shape = props.patternShape ?? ShapeType.Rectangle;

  if (canvas === null || shape === ShapeType.Rectangle || !props.searchRegion) {
    setSelected(false);

    return;
  }

  const rect = canvas.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    setSelected(false);

    return;
  }

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const point = {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };

  setSelected(isPointInPatternShape(point, { ...props.searchRegion, shape }));
}

function drawRegion(
  ctx: CanvasRenderingContext2D,
  params: {
    region: SearchRegion;
    label: string;
    color: string;
    isActive: boolean;
    showHandles: boolean;
  },
): void {
  const { region, label, color, isActive, showHandles } = params;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = isActive ? `${color}24` : `${color}12`;
  ctx.lineWidth = isActive ? 2.5 : 1.5;
  ctx.setLineDash([6, 4]);
  ctx.fillRect(region.x, region.y, region.width, region.height);
  ctx.strokeRect(region.x, region.y, region.width, region.height);
  ctx.setLineDash([]);

  if (showHandles) {
    ctx.fillStyle = color;

    for (const handle of regionHandles(region)) {
      ctx.fillRect(handle.x - 4, handle.y - 4, 8, 8);
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1;
      ctx.strokeRect(handle.x - 4, handle.y - 4, 8, 8);
    }
  }

  ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
  const labelWidth = Math.max(98, ctx.measureText(label).width + 14);
  ctx.fillRect(region.x, Math.max(0, region.y - 18), labelWidth, 16);
  ctx.fillStyle = color;
  ctx.font = "bold 10px monospace";
  ctx.fillText(label, region.x + 6, Math.max(11, region.y - 6));
  ctx.restore();
}
