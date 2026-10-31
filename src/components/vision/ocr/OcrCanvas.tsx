import React, { useEffect, useRef, useState } from "react";
import type { WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";
import { hitRegionHandle, regionForDrag, regionHandles } from "../white-box/pattern-geometry";
import type { RegionDrag, SearchRegion } from "../white-box/types";

export interface OcrCanvasProps {
  source: WhiteBoxMarkingInput | null;
  textRegion: { x: number; y: number; width: number; height: number };
  onTextRegionChange: (region: { x: number; y: number; width: number; height: number }) => void;
}

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

/**
 * Canvas for the OCR tool configure page. Draws the decoded image pixels
 * directly (no <img> tag, no URL loading) following the PatternCanvas pattern
 * used by the working Greyscale tool. The text region supports the same
 * 8-handle resize + drag-to-move interactions as Pin1/Greyscale.
 */
export function OcrCanvas(props: OcrCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragState, setDragState] = useState<RegionDrag | null>(null);
  // Transform from source-image coords to canvas coords (set during draw).
  const transformRef = useRef<{ scale: number; offsetX: number; offsetY: number } | null>(null);

  const toSearchRegion = (): SearchRegion => ({
    x: props.textRegion.x,
    y: props.textRegion.y,
    width: props.textRegion.width,
    height: props.textRegion.height,
  });

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Background
    ctx.fillStyle = "#12151b";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (props.source) {
      const { width: srcW, height: srcH, rgba } = props.source;
      const scale = Math.min(CANVAS_WIDTH / srcW, CANVAS_HEIGHT / srcH);
      const drawW = Math.round(srcW * scale);
      const drawH = Math.round(srcH * scale);
      const offsetX = Math.round((CANVAS_WIDTH - drawW) / 2);
      const offsetY = Math.round((CANVAS_HEIGHT - drawH) / 2);
      transformRef.current = { scale, offsetX, offsetY };

      const off = document.createElement("canvas");
      off.width = srcW;
      off.height = srcH;
      const offCtx = off.getContext("2d");

      if (offCtx) {
        const imgData = offCtx.createImageData(srcW, srcH);
        imgData.data.set(rgba);
        offCtx.putImageData(imgData, 0, 0);
        ctx.drawImage(off, offsetX, offsetY, drawW, drawH);
      }

      // Text region overlay (in canvas coords).
      const region = toSearchRegion();
      const rx = offsetX + region.x * scale;
      const ry = offsetY + region.y * scale;
      const rw = region.width * scale;
      const rh = region.height * scale;

      ctx.save();
      ctx.strokeStyle = "#00ff9d";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(0, 255, 157, 0.08)";
      ctx.fillRect(rx, ry, rw, rh);

      // Resize handles (same 8-handle style as Greyscale).
      const canvasRegion: SearchRegion = { x: rx, y: ry, width: rw, height: rh };

      for (const handle of regionHandles(canvasRegion)) {
        ctx.fillStyle = "#00ff9d";
        ctx.fillRect(handle.x - 4, handle.y - 4, 8, 8);
        ctx.strokeStyle = "#06281c";
        ctx.lineWidth = 1;
        ctx.strokeRect(handle.x - 4, handle.y - 4, 8, 8);
      }

      ctx.fillStyle = "#00ff9d";
      ctx.font = "bold 11px monospace";
      ctx.fillText("TEXT REGION", rx + 6, ry - 6 < 10 ? ry + 16 : ry - 6);
      ctx.restore();
    } else {
      transformRef.current = null;
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No image loaded.", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
      ctx.font = "11px sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText(
        "Click Register Image below to load an image.",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 12,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.source, props.textRegion, dragState]);

  /** Convert a pointer event to source-image coordinates. */
  const toSourcePoint = (
    e: React.PointerEvent<HTMLCanvasElement>,
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    const t = transformRef.current;

    if (!canvas || !t) return null;

    const rect = canvas.getBoundingClientRect();
    const canvasX = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const canvasY = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;

    return {
      x: (canvasX - t.offsetX) / t.scale,
      y: (canvasY - t.offsetY) / t.scale,
    };
  };

  /** Convert a source-image point to canvas coordinates (for handle hits). */
  const toCanvasPoint = (p: { x: number; y: number }): { x: number; y: number } | null => {
    const t = transformRef.current;

    if (!t) return null;

    return { x: p.x * t.scale + t.offsetX, y: p.y * t.scale + t.offsetY };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const srcPt = toSourcePoint(e);

    if (!srcPt || !props.source) return;

    // Hit-test handles in canvas coords (handles are drawn there).
    const canvasPt = toCanvasPoint(srcPt);

    if (!canvasPt) return;

    const t = transformRef.current!;
    const region = toSearchRegion();
    const canvasRegion: SearchRegion = {
      x: region.x * t.scale + t.offsetX,
      y: region.y * t.scale + t.offsetY,
      width: region.width * t.scale,
      height: region.height * t.scale,
    };
    const handle = hitRegionHandle(canvasRegion, canvasPt);

    if (handle === "new") return;

    setDragState({ handle, start: srcPt, region });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragState || !props.source) return;

    const srcPt = toSourcePoint(e);

    if (!srcPt) return;

    const next = regionForDrag(props.source.width, props.source.height, dragState, srcPt);

    props.onTextRegionChange({
      x: Math.round(next.x),
      y: Math.round(next.y),
      width: Math.max(1, Math.round(next.width)),
      height: Math.max(1, Math.round(next.height)),
    });
  };

  const handlePointerUp = () => {
    setDragState(null);
  };

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="aspect-video max-h-full max-w-full cursor-crosshair rounded border border-[#4b5563] bg-black object-contain shadow-[0_18px_60px_rgba(0,0,0,0.45)]"
    />
  );
}
