import { useEffect, useRef, useState } from "react";
import { useCanvasPointerDrag } from "@/components/vision/white-box/useCanvasPointerDrag";
import { RoiToolbar, type RoiShapeType } from "@/components/vision/white-box/RoiToolbar";
import { drawRgbaToCanvas, toThresholdPreviewRgba } from "@/lib/vision/white-box-marking";
import { CHIP_DEFECTIVE_DATA_URL, CHIP_GOOD_DATA_URL, CHIP_STM8_DATA_URL } from "./chip-assets";
import { drawConveyorSimulation, getConveyorReticleRect } from "./conveyor-simulation-drawing";
import {
  drawMatchEnvelope,
  drawMatchedBoxItems,
  drawMatchSearchRegion,
} from "./pattern-match-canvas-drawing";
import type { PatternMatchCanvasProps } from "./types";

export function PatternMatchCanvas(props: PatternMatchCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const totalTravelPxRef = useRef<number>(0);
  const chipGoodImgRef = useRef<HTMLImageElement | null>(null);
  const chipDefImgRef = useRef<HTMLImageElement | null>(null);
  const chipStm8ImgRef = useRef<HTMLImageElement | null>(null);

  const [isLocked, setIsLocked] = useState(false);
  const [shape, setShape] = useState<RoiShapeType>("square");
  const [opacity, setOpacity] = useState(100);

  const isSimulating = props.simulation?.isSimulating ?? false;

  const drag = useCanvasPointerDrag({
    source: null,
    // Spec 55 & 83: the taught search region is draggable in Image Inspection mode
    searchRegion: props.searchRegion,
    dragState: props.dragState,
    onSearchRegionChange: props.onSearchRegionChange,
    onDragStateChange: props.onDragStateChange,
    isSquareROI: shape === "square",
  });

  // Pre-load chip images
  useEffect(() => {
    const imgGood = new Image();
    imgGood.src = CHIP_GOOD_DATA_URL;
    chipGoodImgRef.current = imgGood;

    const imgDef = new Image();
    imgDef.src = CHIP_DEFECTIVE_DATA_URL;
    chipDefImgRef.current = imgDef;

    const imgStm8 = new Image();
    imgStm8.src = CHIP_STM8_DATA_URL;
    chipStm8ImgRef.current = imgStm8;
  }, []);

  // Simulation Animation Loop
  useEffect(() => {
    if (!isSimulating) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    let animationFrameId: number;
    let lastTimestamp = performance.now();

    const renderLoop = (timestamp: number) => {
      const dtSec = Math.min(0.1, (timestamp - lastTimestamp) / 1000);
      lastTimestamp = timestamp;

      if (props.simulation?.isPlaying) {
        const speedPxPerSec = (props.simulation.beltSpeedMmPerS / 450) * 110;
        totalTravelPxRef.current += speedPxPerSec * dtSec;
      }

      drawConveyorSimulation({
        ctx,
        width: canvas.width,
        height: canvas.height,
        totalTravelPx: totalTravelPxRef.current,
        encoderTick: props.simulation?.encoderTick ?? 484200,
        beltSpeedMmPerS: props.simulation?.beltSpeedMmPerS ?? 450,
        selectedDeviceIndex: props.simulation?.selectedDeviceIndex ?? null,
        deviceResults: props.simulation?.deviceResults ?? [],
        deviceChipTypes: props.simulation?.deviceChipTypes ?? [],
        chipGoodImg: chipGoodImgRef.current,
        chipStm8Img: chipStm8ImgRef.current,
        phase: props.simulation?.phase ?? "capturing",
        capturedFrames: props.simulation?.capturedFrames ?? [],
        taughtSearchRegion: props.searchRegion ?? null,
        onCapturePocket: (pocketIndex, chipRect) => {
          const existing = props.simulation?.capturedFrames[pocketIndex];
          let imgData: ImageData | null = existing?.imgData ?? null;
          let dataUrl: string | undefined = existing?.thumbnailDataUrl;
          let captureOrigin = existing?.captureOrigin;

          if (existing === null || existing === undefined) {
            try {
              imgData = ctx.getImageData(chipRect.x, chipRect.y, chipRect.width, chipRect.height);
              const offCanvas = document.createElement("canvas");
              offCanvas.width = chipRect.width;
              offCanvas.height = chipRect.height;
              const offCtx = offCanvas.getContext("2d");

              if (offCtx !== null) {
                offCtx.putImageData(imgData, 0, 0);
                dataUrl = offCanvas.toDataURL();
              }

              captureOrigin = chipRect;
            } catch {
              imgData = null;
              dataUrl = "";
              captureOrigin = chipRect;
            }
          }

          props.simulation?.capturePocket(pocketIndex, imgData, dataUrl, captureOrigin);
        },
        onDeviceAtInspection: (deviceIndex, chipRect) => {
          let imgData: ImageData | null = null;
          let dataUrl: string | undefined = undefined;
          let captureOrigin: { x: number; y: number; width: number; height: number } | undefined =
            undefined;

          try {
            imgData = ctx.getImageData(chipRect.x, chipRect.y, chipRect.width, chipRect.height);
            const offCanvas = document.createElement("canvas");
            offCanvas.width = chipRect.width;
            offCanvas.height = chipRect.height;
            const offCtx = offCanvas.getContext("2d");

            if (offCtx !== null) {
              offCtx.putImageData(imgData, 0, 0);
              dataUrl = offCanvas.toDataURL();
            }

            captureOrigin = chipRect;
          } catch {
            imgData = null;
            dataUrl = undefined;
            captureOrigin = chipRect;
          }

          props.simulation?.executeTrueDeviceDetection(
            deviceIndex,
            imgData,
            captureOrigin,
            dataUrl,
          );
        },
      });

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSimulating, props.simulation]);

  // Static Mode Rendering
  useEffect(() => {
    if (isSimulating) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const width = 960;
    const height = 540;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    canvas.width = width;
    canvas.height = height;

    if (props.source) {
      if (props.source.width === width && props.source.height === height) {
        const previewRgba = toThresholdPreviewRgba(props.source, props.greyscaleLevel);
        const imgData = new ImageData(new Uint8ClampedArray(previewRgba), width, height);

        ctx.putImageData(imgData, 0, 0);
      } else {
        const previewRgba = toThresholdPreviewRgba(props.source, props.greyscaleLevel);
        const offCanvas = document.createElement("canvas");
        offCanvas.width = props.source.width;
        offCanvas.height = props.source.height;
        const offCtx = offCanvas.getContext("2d");

        if (offCtx) {
          const imgData = new ImageData(
            new Uint8ClampedArray(previewRgba),
            props.source.width,
            props.source.height,
          );
          offCtx.putImageData(imgData, 0, 0);

          ctx.drawImage(offCanvas, 0, 0, width, height);
        }
      }
    } else {
      ctx.fillStyle = "#141414";
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "#6b7280";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No Image Loaded", width / 2, height / 2 - 10);
      ctx.font = "11px sans-serif";
      ctx.fillStyle = "#4b5563";
      ctx.fillText(
        'Click "Load Test Image" or "Live Camera" above to inspect',
        width / 2,
        height / 2 + 12,
      );
      ctx.textAlign = "start";
    }

    if (!props.hasOverlays || !props.source) {
      return;
    }

    if (props.matchResult) {
      drawMatchEnvelope(ctx, props.matchResult);
      drawMatchedBoxItems(ctx, props.matchResult.boxResults);
    }

    // Taught search region (Spec 55 & 83: the static view actively draws 8 white/slate handles + boundary)
    if (props.searchRegion) {
      drawMatchSearchRegion(ctx, props.searchRegion);
    }
  }, [
    isSimulating,
    props.source,
    props.matchResult,
    props.greyscaleLevel,
    props.hasOverlays,
    props.searchRegion,
  ]);

  return (
    <div className="relative flex flex-1 h-full w-full min-h-0 items-center justify-center overflow-hidden bg-[#0d0f12] p-1.5">
      <div className="relative aspect-video h-full w-full max-h-full max-w-full">
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          onPointerDown={isSimulating || isLocked ? undefined : drag.handlePointerDown}
          onPointerMove={isSimulating || isLocked ? undefined : drag.handlePointerMove}
          onPointerUp={isSimulating || isLocked ? undefined : drag.handlePointerUp}
          className={`block aspect-video h-full w-full max-h-full max-w-full rounded border border-ca-border bg-black object-contain shadow-2xl ${
            isLocked ? "cursor-not-allowed" : "cursor-default"
          }`}
        />
        <RoiToolbar
          region={isSimulating ? getConveyorReticleRect(960, 540) : (props.searchRegion ?? null)}
          canvasWidth={960}
          canvasHeight={540}
          label={isSimulating ? "CAMERA RETICLE" : "SEARCH REGION"}
          isLocked={isLocked}
          onToggleLock={() => setIsLocked((prev) => !prev)}
          shape={shape}
          onShapeChange={setShape}
          isMaskEnabled={props.hasOverlays}
          opacity={opacity}
          onOpacityChange={setOpacity}
        />
      </div>
    </div>
  );
}
