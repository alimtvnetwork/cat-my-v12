import { useEffect, useRef } from "react";
import { drawRgbaToCanvas, toThresholdPreviewRgba } from "@/lib/vision/white-box-marking";
import { drawFormulatedEnvelope, drawPatternBoxes, drawSearchRegion, drawToleranceZones } from "./canvas-drawing";
import { useCanvasPointerDrag } from "./useCanvasPointerDrag";
import type { FormulatedPatternGeometry, RegionDrag, SearchRegion, WhiteBoxMark, WhiteBoxMarkingInput, WhiteBoxMarkingResult } from "./types";

export interface PatternCanvasProps {
  source: WhiteBoxMarkingInput | null;
  result: WhiteBoxMarkingResult | null;
  searchRegion: SearchRegion | null;
  greyscaleLevel: number;
  detectedBoxes: readonly WhiteBoxMark[];
  excludedNumbers: ReadonlySet<number>;
  formulatedPattern: FormulatedPatternGeometry | null;
  dragState: RegionDrag | null;
  onSearchRegionChange: (region: SearchRegion | null) => void;
  onDragStateChange: (drag: RegionDrag | null) => void;
}

export function PatternCanvas(props: PatternCanvasProps): React.JSX.Element {
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
      ? { width: source.width, height: source.height, rgba: toThresholdPreviewRgba(source, props.greyscaleLevel) }
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

    if (props.formulatedPattern && props.formulatedPattern.toleranceZones.length > 0 && isCleanBase) {
      drawToleranceZones(ctx, props.formulatedPattern.toleranceZones);
    }

    if (props.detectedBoxes.length > 0 && isCleanBase) {
      drawPatternBoxes(ctx, props.detectedBoxes, props.excludedNumbers);
    }

    if (props.formulatedPattern) {
      drawFormulatedEnvelope(ctx, props.formulatedPattern);
    }
  }, [
    props.result,
    props.source,
    props.searchRegion,
    props.greyscaleLevel,
    props.detectedBoxes,
    props.excludedNumbers,
    props.formulatedPattern,
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
