import React, { useEffect, useRef } from "react";
import type { SearchRegion, WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";
import type { RegionDrag } from "@/components/vision/white-box/types";
import { regionHandles } from "@/components/vision/white-box/pattern-geometry";
import { useCanvasPointerDrag } from "@/components/vision/white-box/useCanvasPointerDrag";
import {
  STANDARD_CANVAS_HEIGHT,
  STANDARD_CANVAS_WIDTH,
} from "@/components/vision/standard/tools/pattern-matching/usePatternMatchingRule";
import { HolePolarityType, type Pin1HoleItem, type Pin1MatchResult, type Pin1RegionEditMode } from "./types";

export interface Pin1CanvasProps {
  source: WhiteBoxMarkingInput | null;
  searchRegion: SearchRegion | null;
  packageRegion: SearchRegion | null;
  activeRegion: SearchRegion | null;
  regionEditMode: Pin1RegionEditMode;
  detectedHoles: readonly Pin1HoleItem[];
  registeredPin1: Pin1HoleItem | null;
  matchResult: Pin1MatchResult | null;
  hasOverlays: boolean;
  hasGreyscalePreview?: boolean;
  thresholdLuma?: number;
  polarity?: HolePolarityType;
  dragState: RegionDrag | null;
  onSearchRegionChange: (region: SearchRegion | null) => void;
  onDragStateChange: (drag: RegionDrag | null) => void;
  onSelectHole?: (id: number) => void;
}

function createThresholdPreview(
  source: WhiteBoxMarkingInput,
  threshold = 128,
  polarity = HolePolarityType.DarkIndentation,
): ImageData {
  const output = new ImageData(source.width, source.height);
  const data = output.data;
  const raw = source.rgba;
  const totalPixels = source.width * source.height;

  for (let i = 0; i < totalPixels; i += 1) {
    const idx = i * 4;
    const luma = Math.round(0.299 * raw[idx] + 0.587 * raw[idx + 1] + 0.114 * raw[idx + 2]);
    const isTarget =
      polarity === HolePolarityType.DarkIndentation ? luma <= threshold : luma >= threshold;

    // Show continuous greyscale with active hole pixels highlighted in bright white
    const val = isTarget ? 255 : luma;
    data[idx] = val;
    data[idx + 1] = val;
    data[idx + 2] = val;
    data[idx + 3] = 255;
  }

  return output;
}

export function Pin1Canvas(props: Pin1CanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drag = useCanvasPointerDrag({
    source: props.source,
    searchRegion: props.activeRegion,
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

    if (props.searchRegion) {
      drawRegion(ctx, {
        region: props.searchRegion,
        label: "SEARCH REGION",
        color: "#facc15",
        isActive: props.regionEditMode === "search",
      });
    }

    if (props.packageRegion) {
      drawRegion(ctx, {
        region: props.packageRegion,
        label: "PACKAGE REGION",
        color: "#38bdf8",
        isActive: props.regionEditMode === "package",
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
      const isPrimary = hasRule ? (isMatchedActiveHole && isPass) : (hole.isPrimaryPin1 && hole.isKept);

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
      ctx.arc(hole.centerX, hole.centerY, hole.radius, 0, Math.PI * 2);
      ctx.stroke();

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

      const isBadgeSuccess = !hasRule ? isPrimary : (isMatchedActiveHole && isPass);
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
  ]);

  return (
    <div className="flex h-full flex-1 items-center justify-center overflow-auto border-r border-ca-border bg-ca-bg p-3 select-none">
      <canvas
        ref={canvasRef}
        width={STANDARD_CANVAS_WIDTH}
        height={STANDARD_CANVAS_HEIGHT}
        onPointerDown={(event) => {
          if (selectHoleAtPoint(event, props, canvasRef.current)) {
            return;
          }

          drag.handlePointerDown(event);
        }}
        onPointerMove={drag.handlePointerMove}
        onPointerUp={drag.handlePointerUp}
        onPointerCancel={drag.handlePointerUp}
        className="aspect-video max-h-full max-w-full cursor-crosshair rounded border border-ca-border bg-black object-contain shadow-md"
      />
    </div>
  );
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

function drawRegion(
  ctx: CanvasRenderingContext2D,
  params: {
    region: SearchRegion;
    label: string;
    color: string;
    isActive: boolean;
  },
): void {
  const { region, label, color, isActive } = params;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = isActive ? `${color}24` : `${color}12`;
  ctx.lineWidth = isActive ? 2.5 : 1.5;
  ctx.setLineDash([6, 4]);
  ctx.fillRect(region.x, region.y, region.width, region.height);
  ctx.strokeRect(region.x, region.y, region.width, region.height);
  ctx.setLineDash([]);

  if (isActive) {
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
