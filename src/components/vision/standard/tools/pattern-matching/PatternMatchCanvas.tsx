import { useEffect, useRef } from "react";
import { useCanvasPointerDrag } from "@/components/vision/white-box/useCanvasPointerDrag";
import { RoiToolbar } from "@/components/vision/white-box/RoiToolbar";
import { drawRgbaToCanvas, toThresholdPreviewRgba } from "@/lib/vision/white-box-marking";
import { CHIP_DEFECTIVE_DATA_URL, CHIP_GOOD_DATA_URL, CHIP_STM8_DATA_URL } from "./chip-assets";
import { drawConveyorSimulation, getConveyorReticleRect } from "./conveyor-simulation-drawing";
import { drawMatchEnvelope, drawMatchedBoxItems } from "./pattern-match-canvas-drawing";
import type { PatternMatchCanvasProps } from "./types";

export function PatternMatchCanvas(props: PatternMatchCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const totalTravelPxRef = useRef<number>(0);
  const chipGoodImgRef = useRef<HTMLImageElement | null>(null);
  const chipDefImgRef = useRef<HTMLImageElement | null>(null);
  const chipStm8ImgRef = useRef<HTMLImageElement | null>(null);

  const isSimulating = props.simulation?.isSimulating ?? false;

  const drag = useCanvasPointerDrag({
    source: null,
    // Spec 55: the taught search region is draggable in Image Inspection
    // mode (previously the canvas ignored it for dragging/drawing).
    searchRegion: props.searchRegion,
    dragState: props.dragState,
    onSearchRegionChange: props.onSearchRegionChange,
    onDragStateChange: props.onDragStateChange,
    isSquareROI: true,
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
          // Spec 55: crop the LIVE canvas at trigger time (the chip rect
          // just drawn this frame) and carry the crop origin. Never draw
          // the chip asset alone into a fresh canvas: that discarded the
          // drawn position entirely.
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
              // Capture failure reports, never silently falls back to the
              // asset: the frame carries null pixels and its origin, and
              // evaluation yields a no-frame result for this pocket.
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

    // Taught search region (spec 55: the static view draws it; the drag
    // hook above makes it movable in Image Inspection mode).
    if (props.searchRegion) {
      const region = props.searchRegion;

      ctx.save();
      ctx.strokeStyle = "rgba(250, 204, 21, 0.96)";
      ctx.fillStyle = "rgba(250, 204, 21, 0.12)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.fillRect(region.x, region.y, region.width, region.height);
      ctx.strokeRect(region.x, region.y, region.width, region.height);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
      ctx.fillRect(region.x, Math.max(0, region.y - 18), 94, 16);
      ctx.fillStyle = "#fef08a";
      ctx.font = "bold 10px monospace";
      ctx.fillText("SEARCH REGION", region.x + 6, Math.max(11, region.y - 6));
      ctx.restore();
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
          onPointerDown={isSimulating ? undefined : drag.handlePointerDown}
          onPointerMove={isSimulating ? undefined : drag.handlePointerMove}
          onPointerUp={isSimulating ? undefined : drag.handlePointerUp}
          className="block aspect-video h-full w-full max-h-full max-w-full rounded border border-ca-border bg-black object-contain shadow-2xl cursor-default"
        />
        <RoiToolbar
          region={isSimulating ? getConveyorReticleRect(960, 540) : (props.searchRegion ?? null)}
          canvasWidth={960}
          canvasHeight={540}
          label={isSimulating ? "CAMERA RETICLE" : "SEARCH REGION"}
        />
      </div>
    </div>
  );
}
