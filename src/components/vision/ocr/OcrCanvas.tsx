import React, { useEffect, useRef } from "react";
import type { WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";

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
 * used by the working Greyscale tool.
 */
export function OcrCanvas(props: OcrCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragState = useRef<{
    startX: number;
    startY: number;
    origRegion: { x: number; y: number; width: number; height: number };
  } | null>(null);

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
      // Draw the source image scaled to fit the canvas.
      const { width: srcW, height: srcH, rgba } = props.source;
      const scale = Math.min(CANVAS_WIDTH / srcW, CANVAS_HEIGHT / srcH);
      const drawW = Math.round(srcW * scale);
      const drawH = Math.round(srcH * scale);
      const offsetX = Math.round((CANVAS_WIDTH - drawW) / 2);
      const offsetY = Math.round((CANVAS_HEIGHT - drawH) / 2);

      // Put the RGBA data into an offscreen canvas, then draw scaled.
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

      // Draw the text region overlay (scaled to canvas coordinates).
      const rx = offsetX + props.textRegion.x * scale;
      const ry = offsetY + props.textRegion.y * scale;
      const rw = props.textRegion.width * scale;
      const rh = props.textRegion.height * scale;

      ctx.save();
      ctx.strokeStyle = "#00ff9d";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(0, 255, 157, 0.08)";
      ctx.fillRect(rx, ry, rw, rh);
      ctx.fillStyle = "#00ff9d";
      ctx.font = "bold 11px monospace";
      ctx.fillText("TEXT REGION", rx + 6, ry + 16);
      ctx.restore();

      // Store the transform for pointer interactions.
      (canvas as any)._ocrTransform = { scale, offsetX, offsetY, srcW, srcH };
    } else {
      // Empty state
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
  }, [props.source, props.textRegion]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const transform = (canvas as any)?._ocrTransform;

    if (!transform || !props.source) return;

    const rect = canvas.getBoundingClientRect();
    const canvasX = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const canvasY = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;

    // Convert to source image coordinates.
    const srcX = (canvasX - transform.offsetX) / transform.scale;
    const srcY = (canvasY - transform.offsetY) / transform.scale;

    dragState.current = {
      startX: srcX,
      startY: srcY,
      origRegion: { ...props.textRegion },
    };

    canvas.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragState.current;
    const canvas = canvasRef.current;

    if (!canvas) return;

    const transform = (canvas as any)?._ocrTransform;

    if (!drag || !transform || !props.source) return;

    const rect = canvas.getBoundingClientRect();
    const canvasX = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const canvasY = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    const srcX = (canvasX - transform.offsetX) / transform.scale;
    const srcY = (canvasY - transform.offsetY) / transform.scale;

    const dx = srcX - drag.startX;
    const dy = srcY - drag.startY;

    props.onTextRegionChange({
      x: Math.max(0, Math.round(drag.origRegion.x + dx)),
      y: Math.max(0, Math.round(drag.origRegion.y + dy)),
      width: drag.origRegion.width,
      height: drag.origRegion.height,
    });
  };

  const handlePointerUp = () => {
    dragState.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="aspect-video max-h-full max-w-full cursor-move rounded border border-[#4b5563] bg-black object-contain shadow-[0_18px_60px_rgba(0,0,0,0.45)]"
    />
  );
}
