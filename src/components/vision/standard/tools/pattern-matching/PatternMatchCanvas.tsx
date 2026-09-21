import { useEffect, useRef } from "react";
import { useCanvasPointerDrag } from "@/components/vision/white-box/useCanvasPointerDrag";
import { drawRgbaToCanvas, toThresholdPreviewRgba } from "@/lib/vision/white-box-marking";
import {
  drawMatchEnvelope,
  drawMatchedBoxItems,
  drawMatchSearchRegion,
} from "./pattern-match-canvas-drawing";
import type { PatternMatchCanvasProps } from "./types";

export function PatternMatchCanvas(props: PatternMatchCanvasProps): React.JSX.Element {
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

    const width = props.source?.width ?? 960;
    const height = props.source?.height ?? 540;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    if (props.source) {
      const previewRgba = toThresholdPreviewRgba(props.source, props.greyscaleLevel);
      drawRgbaToCanvas(canvas, props.source.width, props.source.height, previewRgba);
    } else {
      ctx.fillStyle = "#141414";
      ctx.fillRect(0, 0, width, height);
    }

    if (!props.hasOverlays) {
      return;
    }

    if (props.searchRegion) {
      drawMatchSearchRegion(ctx, props.searchRegion);
    }

    if (props.matchResult) {
      drawMatchEnvelope(ctx, props.matchResult);
      drawMatchedBoxItems(ctx, props.matchResult.boxResults);
    }
  }, [
    props.source,
    props.matchResult,
    props.searchRegion,
    props.greyscaleLevel,
    props.hasOverlays,
  ]);

  return (
    <div className="flex flex-1 items-center justify-center overflow-auto bg-ca-bg p-3">
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
