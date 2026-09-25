import React, { useEffect, useRef } from "react";
import { drawRgbaToCanvas, toThresholdPreviewRgba } from "@/lib/vision/white-box-marking";
import { drawFormulatedEnvelope, drawSearchRegion, drawToleranceZones } from "@/components/vision/white-box/canvas-drawing";
import { useCanvasPointerDrag } from "@/components/vision/white-box/useCanvasPointerDrag";
import type { FormulatedPatternGeometry, RegionDrag, SearchRegion, WhiteBoxMark, WhiteBoxMarkingInput, WhiteBoxMarkingResult } from "@/components/vision/white-box/types";

export interface DefectCanvasProps {
  source: WhiteBoxMarkingInput | null;
  result: WhiteBoxMarkingResult | null;
  searchRegion: SearchRegion | null;
  greyscaleLevel: number;
  detectedBoxes: readonly WhiteBoxMark[];
  excludedNumbers: ReadonlySet<number>;
  formulatedDefect: FormulatedPatternGeometry | null;
  dragState: RegionDrag | null;
  onSearchRegionChange: (region: SearchRegion | null) => void;
  onDragStateChange: (drag: RegionDrag | null) => void;
}

function drawDefectFlawBoxes(
  ctx: CanvasRenderingContext2D,
  boxes: readonly WhiteBoxMark[],
  excluded: ReadonlySet<number>,
): void {
  ctx.save();

  for (const box of boxes) {
    const isExcluded = excluded.has(box.number);

    if (isExcluded) {
      ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
      ctx.fillStyle = "rgba(148, 163, 184, 0.1)";
      ctx.lineWidth = 1;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      continue;
    }

    // Active defect box: Rose red industrial highlight
    ctx.strokeStyle = "#f43f5e";
    ctx.fillStyle = "rgba(244, 63, 94, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.fillRect(box.x, box.y, box.width, box.height);
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    // Number tag badge
    ctx.fillStyle = "#f43f5e";
    ctx.fillRect(box.x, Math.max(0, box.y - 14), 16, 14);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px monospace";
    ctx.fillText(String(box.number), box.x + 2, Math.max(10, box.y - 3));
  }

  ctx.restore();
}

export function DefectCanvas(props: DefectCanvasProps): React.JSX.Element {
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
    const source = props.source;
    const isCleanBase = source !== null;
    const image = source
      ? {
          width: source.width,
          height: source.height,
          rgba: toThresholdPreviewRgba(source, props.greyscaleLevel),
        }
      : props.result;

    if (canvas === null || image === null) {
      return;
    }

    drawRgbaToCanvas(canvas, image.width, image.height, image.rgba);

    const ctx = canvas.getContext("2d");

    if (ctx === null) {
      return;
    }

    if (props.searchRegion) {
      drawSearchRegion(ctx, props.searchRegion);
    }

    if (props.formulatedDefect && props.formulatedDefect.toleranceZones.length > 0 && isCleanBase) {
      drawToleranceZones(ctx, props.formulatedDefect.toleranceZones);
    }

    if (props.detectedBoxes.length > 0 && isCleanBase) {
      drawDefectFlawBoxes(ctx, props.detectedBoxes, props.excludedNumbers);
    }

    if (props.formulatedDefect) {
      drawFormulatedEnvelope(ctx, props.formulatedDefect);
    }
  }, [
    props.result,
    props.source,
    props.searchRegion,
    props.greyscaleLevel,
    props.detectedBoxes,
    props.excludedNumbers,
    props.formulatedDefect,
  ]);

  return (
    <div className="h-full overflow-auto border-r border-ca-border bg-ca-bg p-3">
      <canvas
        ref={canvasRef}
        width={props.source?.width ?? 960}
        height={props.source?.height ?? 540}
        onPointerDown={drag.handlePointerDown}
        onPointerMove={drag.handlePointerMove}
        onPointerUp={drag.handlePointerUp}
        className="max-h-full max-w-full cursor-crosshair rounded border border-ca-border bg-black object-contain shadow-md"
      />
    </div>
  );
}
