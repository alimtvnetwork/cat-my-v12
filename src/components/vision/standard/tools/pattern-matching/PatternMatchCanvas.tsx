import { useEffect, useRef } from "react";
import { useCanvasPointerDrag } from "@/components/vision/white-box/useCanvasPointerDrag";
import { drawRgbaToCanvas, toThresholdPreviewRgba } from "@/lib/vision/white-box-marking";
import {
  CHIP_DEFECTIVE_DATA_URL,
  CHIP_GOOD_DATA_URL,
  CHIP_STM8_DATA_URL,
} from "./chip-assets";
import {
  drawConveyorSimulation,
} from "./conveyor-simulation-drawing";
import {
  drawMatchEnvelope,
  drawMatchedBoxItems,
} from "./pattern-match-canvas-drawing";
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
    searchRegion: null,
    dragState: props.dragState,
    onSearchRegionChange: props.onSearchRegionChange,
    onDragStateChange: props.onDragStateChange,
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
        onCapturePocket: (pocketIndex) => {
          const chipType = props.simulation?.deviceChipTypes[pocketIndex] ?? "atmel";
          const isEmpty = chipType === "empty";
          const isStm8 = chipType === "stm8";
          const chipImg = isEmpty ? null : isStm8 ? chipStm8ImgRef.current : chipGoodImgRef.current;
          let imgData: ImageData | null = null;
          let dataUrl: string | undefined = undefined;

          if (chipImg && chipImg.complete && chipImg.naturalWidth > 0) {
            try {
              const offCanvas = document.createElement("canvas");
              offCanvas.width = 140;
              offCanvas.height = 148;
              const offCtx = offCanvas.getContext("2d");

              if (offCtx) {
                offCtx.drawImage(chipImg, 0, 0, 140, 148);
                imgData = offCtx.getImageData(0, 0, 140, 148);
                dataUrl = offCanvas.toDataURL();
              }
            } catch {
              imgData = null;
            }
          }

          props.simulation?.capturePocket(pocketIndex, imgData, dataUrl);
        },
        onDeviceAtInspection: (deviceIndex) => {
          const chipType = props.simulation?.deviceChipTypes[deviceIndex] ?? "atmel";
          const isEmpty = chipType === "empty";
          const isStm8 = chipType === "stm8";
          const chipImg = isEmpty ? null : isStm8 ? chipStm8ImgRef.current : chipGoodImgRef.current;
          let imgData: ImageData | null = null;

          if (chipImg && chipImg.complete && chipImg.naturalWidth > 0) {
            try {
              const offCanvas = document.createElement("canvas");
              offCanvas.width = 140;
              offCanvas.height = 148;
              const offCtx = offCanvas.getContext("2d");

              if (offCtx) {
                offCtx.drawImage(chipImg, 0, 0, 140, 148);
                imgData = offCtx.getImageData(0, 0, 140, 148);
              }
            } catch {
              imgData = null;
            }
          }

          props.simulation?.executeTrueDeviceDetection(deviceIndex, imgData);
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
        const imgData = new ImageData(
          new Uint8ClampedArray(previewRgba),
          width,
          height,
        );

        ctx.putImageData(imgData, 0, 0);
      } else {
        ctx.fillStyle = "#12151b";
        ctx.fillRect(0, 0, width, height);

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

          const scale = Math.min(380 / props.source.width, 380 / props.source.height);
          const dw = Math.round(props.source.width * scale);
          const dh = Math.round(props.source.height * scale);
          const dx = Math.round((width - dw) / 2);
          const dy = Math.round((height - dh) / 2);

          ctx.drawImage(offCanvas, dx, dy, dw, dh);
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
  }, [
    isSimulating,
    props.source,
    props.matchResult,
    props.greyscaleLevel,
    props.hasOverlays,
  ]);

  return (
    <div className="relative flex flex-1 h-full w-full min-h-0 items-center justify-center overflow-hidden bg-[#0d0f12] p-1.5">
      <canvas
        ref={canvasRef}
        width={isSimulating ? 1400 : 960}
        height={isSimulating ? 820 : 540}
        onPointerDown={isSimulating ? undefined : drag.handlePointerDown}
        onPointerMove={isSimulating ? undefined : drag.handlePointerMove}
        onPointerUp={isSimulating ? undefined : drag.handlePointerUp}
        className="h-full w-full max-h-full max-w-full rounded border border-ca-border bg-black object-contain shadow-2xl cursor-default"
      />
    </div>
  );
}
