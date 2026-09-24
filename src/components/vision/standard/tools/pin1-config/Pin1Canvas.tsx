import React, { useEffect, useRef } from "react";
import type { SearchRegion, WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";
import type { RegionDrag } from "@/components/vision/white-box/types";
import { useCanvasPointerDrag } from "@/components/vision/white-box/useCanvasPointerDrag";
import { drawSearchRegion } from "@/components/vision/white-box/canvas-drawing";
import {
  STANDARD_CANVAS_HEIGHT,
  STANDARD_CANVAS_WIDTH,
} from "@/components/vision/standard/tools/pattern-matching/usePatternMatchingRule";
import { HolePolarityType, type Pin1HoleItem, type Pin1MatchResult } from "./types";

export interface Pin1CanvasProps {
  source: WhiteBoxMarkingInput | null;
  searchRegion: SearchRegion | null;
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

    const canvasWidth = props.source?.width ?? STANDARD_CANVAS_WIDTH;
    const canvasHeight = props.source?.height ?? STANDARD_CANVAS_HEIGHT;

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
    if (props.source) {
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

        ctx.drawImage(offscreen, 0, 0);
      }
    }

    if (!props.hasOverlays) {
      return;
    }

    // 4. Render Search Region (ROI) using exact Greyscale handles
    if (props.searchRegion) {
      drawSearchRegion(ctx, props.searchRegion);
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
      const isPass = props.matchResult?.isPass ?? false;
      const isPrimary = hasRule ? isPass : hole.isPrimaryPin1 && hole.isKept;

      const strokeColor = !hole.isKept
        ? "rgba(244, 63, 94, 0.45)"
        : hasRule
          ? isPass
            ? "#10b981"
            : "#f43f5e"
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
      const labelText = hasRule
        ? isPass
          ? `PIN 1 PASS [${hole.circularity}%]`
          : `PIN 1 OFFSET [Δ=${props.matchResult?.deltaDistance ?? 0}px]`
        : isPrimary
          ? `PIN 1 [R=${hole.radius} ${hole.circularity}%]`
          : !hole.isKept
            ? `[EXCLUDED #${hole.id}]`
            : `#${hole.id} [${hole.circularity}%]`;

      ctx.font = "bold 9px monospace";
      const textMetrics = ctx.measureText(labelText);
      const textW = textMetrics.width + 8;
      const badgeX = hole.centerX + hole.radius + 6;
      const badgeY = hole.centerY - 7;

      ctx.fillStyle = isPass || (!hasRule && isPrimary)
        ? "rgba(16, 185, 129, 0.9)"
        : hasRule
          ? "rgba(244, 63, 94, 0.9)"
          : "rgba(15, 23, 42, 0.85)";

      ctx.fillRect(badgeX, badgeY, textW, 14);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(badgeX, badgeY, textW, 14);

      ctx.fillStyle = isPass || (!hasRule && isPrimary) || hasRule ? "#ffffff" : "#e2e8f0";
      ctx.fillText(labelText, badgeX + 4, badgeY + 10);

      ctx.restore();
    }

  }, [
    props.source,
    props.searchRegion,
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
        width={props.source?.width ?? STANDARD_CANVAS_WIDTH}
        height={props.source?.height ?? STANDARD_CANVAS_HEIGHT}
        onPointerDown={drag.handlePointerDown}
        onPointerMove={drag.handlePointerMove}
        onPointerUp={drag.handlePointerUp}
        className="max-h-full max-w-full cursor-crosshair rounded border border-ca-border bg-black object-contain shadow-md"
      />
    </div>
  );
}
