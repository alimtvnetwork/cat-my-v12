import React, { useEffect, useRef } from "react";
import { drawRgbaToCanvas } from "@/lib/vision/white-box-marking";
import { drawSearchRegion } from "@/components/vision/white-box/canvas-drawing";
import { useCanvasPointerDrag } from "@/components/vision/white-box/useCanvasPointerDrag";
import type { RegionDrag } from "@/components/vision/white-box/types";
import type {
  DefectBoxItem,
  DefectMatchResult,
  SearchRegion,
  WhiteBoxMarkingInput,
} from "./types";

export interface DefectMatchCanvasProps {
  source: WhiteBoxMarkingInput | null;
  matchResult: DefectMatchResult | null;
  referenceBoxes: readonly DefectBoxItem[];
  searchRegion: SearchRegion | null;
  hasOverlays: boolean;
  dragState: RegionDrag | null;
  onSearchRegionChange: (region: SearchRegion | null) => void;
  onDragStateChange: (drag: RegionDrag | null) => void;
}

function drawDefectOverlays(
  ctx: CanvasRenderingContext2D,
  result: DefectMatchResult,
): void {
  ctx.save();

  const isFlawDetected = result.hasDefect;

  // 1. Draw individual matched/unmatched boxes
  for (const box of result.boxResults) {
    if (box.isMatched) {
      // Matched flaw: Bright Red / Rose highlight
      ctx.strokeStyle = "#f43f5e";
      ctx.fillStyle = "rgba(244, 63, 94, 0.4)";
      ctx.lineWidth = 2;
      ctx.fillRect(box.matchedX, box.matchedY, box.width, box.height);
      ctx.strokeRect(box.matchedX, box.matchedY, box.width, box.height);

      // Tag
      ctx.fillStyle = "#f43f5e";
      ctx.fillRect(box.matchedX, Math.max(0, box.matchedY - 14), 16, 14);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px monospace";
      ctx.fillText(String(box.boxNumber), box.matchedX + 3, Math.max(10, box.matchedY - 3));
    } else {
      // Unmatched reference element
      ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(box.matchedX, box.matchedY, box.width, box.height);
      ctx.setLineDash([]);
    }
  }

  // 2. Draw Overall Defect Envelope if flaw detected
  if (isFlawDetected && result.defectBounds.width > 0) {
    const b = result.defectBounds;
    ctx.strokeStyle = "#e11d48";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(b.x - 4, b.y - 4, b.width + 8, b.height + 8);

    // Alert label banner
    const bannerText = `DEFECT DETECTED (${result.score}%)`;
    ctx.font = "bold 11px sans-serif";
    const textWidth = ctx.measureText(bannerText).width;
    const bannerW = textWidth + 14;
    const bannerH = 20;
    const bannerX = Math.max(4, b.x - 4);
    const bannerY = Math.max(bannerH + 4, b.y - 8);

    ctx.fillStyle = "#e11d48";
    ctx.fillRect(bannerX, bannerY - bannerH, bannerW, bannerH);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(bannerText, bannerX + 7, bannerY - 5);
  }

  ctx.restore();
}

export function DefectMatchCanvas(props: DefectMatchCanvasProps): React.JSX.Element {
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

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    if (props.source) {
      drawRgbaToCanvas(canvas, props.source.width, props.source.height, props.source.rgba);
    } else {
      // Clean industrial stage backdrop
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;

      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
      ctx.font = "13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Load a workpiece frame or camera snapshot to inspect flaws", canvas.width / 2, canvas.height / 2);
    }

    if (props.hasOverlays) {
      if (props.searchRegion) {
        drawSearchRegion(ctx, props.searchRegion);
      }

      if (props.matchResult) {
        drawDefectOverlays(ctx, props.matchResult);
      }
    }
  }, [props.source, props.searchRegion, props.matchResult, props.hasOverlays]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 items-center justify-center overflow-auto bg-ca-bg p-3 select-none">
      <canvas
        ref={canvasRef}
        width={props.source?.width ?? 960}
        height={props.source?.height ?? 540}
        onPointerDown={drag.handlePointerDown}
        onPointerMove={drag.handlePointerMove}
        onPointerUp={drag.handlePointerUp}
        className="max-h-full max-w-full cursor-crosshair rounded border border-ca-border bg-black object-contain shadow-lg"
      />
    </div>
  );
}
