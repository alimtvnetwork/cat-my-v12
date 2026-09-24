import React, { useEffect, useRef } from "react";
import {
  CARRIER_TAPE_HEIGHT,
  CARRIER_TAPE_WIDTH,
  drawCameraClickFrame,
  preloadAllFrameImages,
} from "./carrier-tape-assets";
import { evaluatePocket, measureDeviceEdges } from "./carrier-tape-evaluator";
import type {
  CarrierTapeFrame,
  DeviceMeasurement,
  MultiRuleToleranceParams,
  PocketInspectionResult,
} from "./types";

export interface CarrierTapeSimulationCanvasProps {
  frame: CarrierTapeFrame;
  isAnalyzing: boolean;
  hasOverlays: boolean;
  selectedPocketIndex?: number | null;
  tolerances?: MultiRuleToleranceParams;
  onSelectPocket?: (pocketIndex: number) => void;
  onResultsAnalyzed?: (
    results: [PocketInspectionResult, PocketInspectionResult, PocketInspectionResult],
  ) => void;
}

interface CameraClickTransition {
  startTime: number;
  durationMs: number;
}

// Conveyor registration jitter (pronounced mechanical displacement per frame: moves up/down/left/right)
const FRAME_JITTER_OFFSETS: readonly { dx: number; dy: number }[] = [
  { dx: 0, dy: 0 },       // Frame 1: Baseline reference
  { dx: 5, dy: -4 },      // Frame 2: Shifted right & up
  { dx: -6, dy: 3 },      // Frame 3: Shifted left & down
  { dx: 7, dy: 5 },       // Frame 4: Shifted right & down
  { dx: -4, dy: -7 },     // Frame 5: Shifted left & up
  { dx: 3, dy: 6 },       // Frame 6: Shifted right & down
  { dx: -7, dy: -3 },     // Frame 7: Shifted left & up
  { dx: 6, dy: -5 },      // Frame 8: Shifted right & up
  { dx: -5, dy: 6 },      // Frame 9: Shifted left & down
  { dx: 8, dy: -4 },      // Frame 10: Shifted right & up
  { dx: -6, dy: 7 },      // Frame 11: Shifted left & down
  { dx: 4, dy: 5 },       // Frame 12: Shifted right & down
  { dx: -7, dy: -6 },     // Frame 13: Shifted left & up
  { dx: 6, dy: -7 },      // Frame 14: Shifted right & up
  { dx: -3, dy: 4 },      // Frame 15: Shifted left & down
];

export function CarrierTapeSimulationCanvas(
  props: CarrierTapeSimulationCanvasProps,
): React.JSX.Element {
  const {
    frame,
    isAnalyzing,
    hasOverlays,
    selectedPocketIndex,
    tolerances,
    onResultsAnalyzed,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameRef = useRef<CarrierTapeFrame>(frame);
  const transitionRef = useRef<CameraClickTransition | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Preload all 15 authentic camera pocket click images on mount
  useEffect(() => {
    preloadAllFrameImages();
  }, []);

  // Detect frame changes and initiate camera optical strobe capture pulse
  useEffect(() => {
    const prevFrame = prevFrameRef.current;
    const curFrame = frame;

    if (prevFrame && prevFrame.frameNumber !== curFrame.frameNumber) {
      transitionRef.current = {
        startTime: performance.now(),
        durationMs: 85,
      };
    }

    prevFrameRef.current = curFrame;
  }, [frame]);

  // Main rendering and inspection analysis loop
  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (!ctx) {
      return;
    }

    let isSubscribed = true;

    const render = () => {
      if (!isSubscribed) {
        return;
      }

      const now = performance.now();
      const transition = transitionRef.current;
      const jitter = FRAME_JITTER_OFFSETS[(frame.frameNumber - 1) % FRAME_JITTER_OFFSETS.length];

      // Clear canvas background
      ctx.fillStyle = "#0c0d10";
      ctx.fillRect(0, 0, CARRIER_TAPE_WIDTH, CARRIER_TAPE_HEIGHT);

      ctx.save();
      ctx.translate(jitter.dx, jitter.dy);

      // 1. Draw discrete camera click snapshot for active frame
      drawCameraClickFrame(ctx, frame);

      // 2. Camera strobe flash pulse effect
      if (transition) {
        const elapsed = now - transition.startTime;

        if (elapsed < transition.durationMs) {
          const flashProgress = elapsed / transition.durationMs;
          const flashAlpha = (1.0 - flashProgress) * 0.35;

          ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
          ctx.fillRect(0, 0, CARRIER_TAPE_WIDTH, CARRIER_TAPE_HEIGHT);

          animFrameIdRef.current = requestAnimationFrame(render);
        } else {
          transitionRef.current = null;
        }
      }

      // 3. Perform real computer vision analysis on active camera pixels
      //    (only during analyzed phase — raw phase shows unprocessed image)
      let activeResults = frame.results;
      const deviceMeasurements: (DeviceMeasurement | null)[] = [null, null, null];

      if (isAnalyzing && tolerances) {
        try {
          const fullImageData = ctx.getImageData(0, 0, CARRIER_TAPE_WIDTH, CARRIER_TAPE_HEIGHT);
          const realResults: PocketInspectionResult[] = [];

          for (let i = 0; i < 3; i += 1) {
            const pocket = frame.pockets[i];
            const pX = Math.max(0, Math.min(CARRIER_TAPE_WIDTH - pocket.width, Math.round(pocket.x + jitter.dx)));
            const pY = Math.max(0, Math.min(CARRIER_TAPE_HEIGHT - pocket.height, Math.round(pocket.y + jitter.dy)));

            const pocketPixels = extractSubRegion(
              fullImageData,
              pX,
              pY,
              pocket.width,
              pocket.height,
            );

            const pixelInput = {
              rgba: pocketPixels,
              width: pocket.width,
              height: pocket.height,
            };

            const evaluated = evaluatePocket(pocket, tolerances, pixelInput);

            // Real edge-based device measurement (only for occupied pockets)
            if (pocket.occupancy !== "empty") {
              deviceMeasurements[i] = measureDeviceEdges(pixelInput);
            }

            realResults.push(evaluated);
          }

          activeResults = realResults as [
            PocketInspectionResult,
            PocketInspectionResult,
            PocketInspectionResult,
          ];

          onResultsAnalyzed?.(activeResults);
        } catch {
          activeResults = frame.results;
        }
      }

      // 4. Draw real-time multi-device inspection overlays (analyzed phase only)
      if (isAnalyzing && hasOverlays) {
        drawPocketInspectionOverlays(
          ctx,
          frame,
          activeResults,
          deviceMeasurements,
          selectedPocketIndex,
          1.0,
        );
      }

      ctx.restore();
    };

    render();

    return () => {
      isSubscribed = false;

      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [frame, isAnalyzing, hasOverlays, selectedPocketIndex, tolerances, onResultsAnalyzed]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 items-center justify-center overflow-auto bg-ca-bg p-3 select-none">
      <canvas
        ref={canvasRef}
        width={CARRIER_TAPE_WIDTH}
        height={CARRIER_TAPE_HEIGHT}
        className="rounded border border-ca-border bg-black shadow-2xl"
        style={{ width: 690, height: 388 }}
      />
    </div>
  );
}

function extractSubRegion(
  source: ImageData,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): Uint8ClampedArray {
  const dest = new Uint8ClampedArray(sw * sh * 4);
  const srcWidth = source.width;
  const srcData = source.data;

  for (let y = 0; y < sh; y += 1) {
    const srcRow = (sy + y) * srcWidth * 4;
    const destRow = y * sw * 4;
    const startByte = srcRow + sx * 4;
    const endByte = startByte + sw * 4;

    dest.set(srcData.subarray(startByte, endByte), destRow);
  }

  return dest;
}

function drawPocketInspectionOverlays(
  ctx: CanvasRenderingContext2D,
  frame: CarrierTapeFrame,
  results: [PocketInspectionResult, PocketInspectionResult, PocketInspectionResult],
  deviceMeasurements: (DeviceMeasurement | null)[],
  selectedPocketIndex?: number | null,
  overlayAlpha = 1.0,
): void {
  if (overlayAlpha <= 0) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1.0, overlayAlpha));

  for (let i = 0; i < 3; i += 1) {
    const pocket = frame.pockets[i];
    const res = results[i] as PocketInspectionResult | undefined;
    const isSelected = selectedPocketIndex === i;

    const { x, y, width, height } = pocket;
    const isPass = res?.verdict === "PASS";
    const isFail = res?.verdict === "FAIL";
    const isEmpty = res?.verdict === "EMPTY";

    const centerX = x + 72;
    const centerY = y + 75;

    // 1. Device Bounding Box: ONLY on the device component (not on the pocket)
    if (isEmpty) {
      // Empty pocket cavity: faint dashed slate outline
      ctx.strokeStyle = "rgba(100, 116, 139, 0.45)";
      ctx.lineWidth = 1.0;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(x + 8, y + 8, width - 16, height - 16);
      ctx.setLineDash([]);
    } else {
      // Occupied pocket: Green (PASS) or Red (REJECT) rectangle drawn strictly on the CHIP DEVICE
      const devHalfW = 51;
      const devHalfH = 47;

      ctx.save();
      ctx.translate(centerX, centerY);

      if (pocket.rotationDeg !== 0) {
        ctx.rotate((pocket.rotationDeg * Math.PI) / 180);
      }

      if (isPass) {
        ctx.strokeStyle = "#10b981";
        ctx.fillStyle = "rgba(16, 185, 129, 0.08)";
        ctx.lineWidth = isSelected ? 2.8 : 2.0;
      } else {
        ctx.strokeStyle = "#ef4444";
        ctx.fillStyle = "rgba(239, 68, 68, 0.10)";
        ctx.lineWidth = isSelected ? 3.0 : 2.2;
      }

      // Main rectangle strictly framing the chip and its leads
      ctx.strokeRect(-devHalfW, -devHalfH, devHalfW * 2, devHalfH * 2);
      ctx.fillRect(-devHalfW, -devHalfH, devHalfW * 2, devHalfH * 2);

      // Precision industrial corner targeting brackets
      const bLen = 10;
      ctx.lineWidth = isSelected ? 3.2 : 2.4;

      // Top-left
      ctx.beginPath();
      ctx.moveTo(-devHalfW, -devHalfH + bLen);
      ctx.lineTo(-devHalfW, -devHalfH);
      ctx.lineTo(-devHalfW + bLen, -devHalfH);
      ctx.stroke();

      // Top-right
      ctx.beginPath();
      ctx.moveTo(devHalfW - bLen, -devHalfH);
      ctx.lineTo(devHalfW, -devHalfH);
      ctx.lineTo(devHalfW, -devHalfH + bLen);
      ctx.stroke();

      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(-devHalfW, devHalfH - bLen);
      ctx.lineTo(-devHalfW, devHalfH);
      ctx.lineTo(-devHalfW + bLen, devHalfH);
      ctx.stroke();

      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(devHalfW - bLen, devHalfH);
      ctx.lineTo(devHalfW, devHalfH);
      ctx.lineTo(devHalfW, devHalfH - bLen);
      ctx.stroke();

      ctx.restore();
    }

    // 2. Top Header HUD Badge (centered directly over the device)
    const badgeH = 16;
    const badgeY = y - badgeH - 3;
    ctx.font = "bold 8.5px monospace";

    let badgeText = `POCKET #${i + 1}: `;
    let badgeBg = "#334155";
    const badgeFg = "#ffffff";

    if (isEmpty) {
      badgeText += "EMPTY [NO COMPONENT]";
      badgeBg = "#475569";
    } else if (isPass) {
      badgeText += `PASS [R1: OK • R2: ${res?.rule2Pattern?.matchedCount ?? 24}/24 (100%)]`;
      badgeBg = "#059669";
    } else if (isFail) {
      if (res?.failedRuleIndex === 1) {
        badgeText += "REJECT [R1: PIN 1 FAIL • R2: SKIPPED]";
      } else {
        badgeText += `REJECT [R1: OK • R2: PATTERN ${res?.rule2Pattern?.score ?? 0}%]`;
      }

      badgeBg = "#dc2626";
    }

    const badgeW = ctx.measureText(badgeText).width + 12;
    const badgeX = centerX - badgeW / 2;
    ctx.fillStyle = badgeBg;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 3);
    ctx.fill();

    ctx.fillStyle = badgeFg;
    ctx.textAlign = "left";
    ctx.fillText(badgeText, badgeX + 6, badgeY + 11.5);

    // 3. Detailed Inspection Visualizations for Occupied Device
    if (!isEmpty && res) {
      // Cavity center inside uncutoff pocket is at (x + 68, y + 76)
      const centerX = x + 68;
      const centerY = y + 76;
      const chipSize = 92;
      const half = chipSize / 2;

      // ---------------------------------------------------------
      // RULE 1: Pin 1 Orientation Rule Visual Representation
      // ---------------------------------------------------------
      const canvasNomX = centerX - 27.0;
      const canvasNomY = centerY - 28.0;

      // A. Nominal Pin 1 Target Reticle (Dashed cyan circle & crosshair)
      ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
      ctx.lineWidth = 1.0;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(canvasNomX, canvasNomY, 7.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
      ctx.beginPath();
      ctx.moveTo(canvasNomX - 4, canvasNomY);
      ctx.lineTo(canvasNomX + 4, canvasNomY);
      ctx.moveTo(canvasNomX, canvasNomY - 4);
      ctx.lineTo(canvasNomX + 4, canvasNomY + 4);
      ctx.stroke();

      // B. Detected Pin 1 Indentation
      if (res.rule1Pin1) {
        if (res.rule1Pin1.hasPin1Found) {
          let detX = canvasNomX;
          let detY = canvasNomY;

          if (res.rule1Pin1.detectedX !== undefined && res.rule1Pin1.detectedY !== undefined) {
            detX = x + res.rule1Pin1.detectedX;
            detY = y + res.rule1Pin1.detectedY;
          } else {
            const angleDeg = res.rule1Pin1.angleDeg ?? pocket.rotationDeg;
            const currentAngleRad = ((-134.0 + angleDeg) * Math.PI) / 180;
            detX = centerX + Math.cos(currentAngleRad) * 38.9;
            detY = centerY + Math.sin(currentAngleRad) * 38.9;
          }

          const isPin1Pass = res.rule1Pin1.isPass;
          const pin1Color = isPin1Pass ? "#10b981" : "#f43f5e";

          // Detected Hole Ring & Center Dot
          ctx.strokeStyle = pin1Color;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(detX, detY, 7.0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = pin1Color;
          ctx.beginPath();
          ctx.arc(detX, detY, 1.8, 0, Math.PI * 2);
          ctx.fill();

          // Reticle crosshairs
          ctx.beginPath();
          ctx.moveTo(detX - 10, detY);
          ctx.lineTo(detX + 10, detY);
          ctx.moveTo(detX, detY - 10);
          ctx.lineTo(detX + 10, detY + 10);
          ctx.stroke();

          // Offset Vector (Line connecting Nominal to Detected)
          const distOffset = Math.hypot(detX - canvasNomX, detY - canvasNomY);

          if (distOffset > 2) {
            ctx.strokeStyle = isPin1Pass ? "rgba(16, 185, 129, 0.85)" : "rgba(244, 63, 94, 0.9)";
            ctx.lineWidth = 1.0;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(canvasNomX, canvasNomY);
            ctx.lineTo(detX, detY);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Offset & Angle telemetry badge
          const sign = res.rule1Pin1.angleDeg > 0 ? "+" : "";
          const tolStr = res.rule1Pin1.angleToleranceDeg !== undefined ? ` (±${res.rule1Pin1.angleToleranceDeg.toFixed(1)}°)` : "";
          const teleText = `Δ ${res.rule1Pin1.offsetPx.toFixed(1)}px | θ ${sign}${res.rule1Pin1.angleDeg.toFixed(1)}°${tolStr}`;
          ctx.font = "bold 7px monospace";
          const teleW = ctx.measureText(teleText).width + 6;
          const teleH = 11;

          ctx.fillStyle = isPin1Pass ? "#064e3b" : "#881337";
          ctx.fillRect(detX - teleW / 2, detY + 10, teleW, teleH);
          ctx.strokeStyle = pin1Color;
          ctx.lineWidth = 0.8;
          ctx.strokeRect(detX - teleW / 2, detY + 10, teleW, teleH);

          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.fillText(teleText, detX, detY + 18);
        } else {
          // Missing Dimple failure indicator
          ctx.strokeStyle = "#f43f5e";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(canvasNomX, canvasNomY, 8.5, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(canvasNomX - 6, canvasNomY - 6);
          ctx.lineTo(canvasNomX + 6, canvasNomY + 6);
          ctx.stroke();

          ctx.font = "bold 7px monospace";
          ctx.fillStyle = "#881337";
          ctx.fillRect(canvasNomX - 42, canvasNomY + 10, 84, 12);
          ctx.strokeStyle = "#f43f5e";
          ctx.lineWidth = 0.8;
          ctx.strokeRect(canvasNomX - 42, canvasNomY + 10, 84, 12);

          ctx.fillStyle = "#fecdd3";
          ctx.textAlign = "center";
          ctx.fillText("MISSING PIN 1 DIMPLE", canvasNomX, canvasNomY + 19);
        }
      }

      // ---------------------------------------------------------
      // RULE 2: greyscale-pattern-match-24-box Visual Representation
      // ---------------------------------------------------------
      if (res.isRule2Skipped || !res.rule1Pin1?.isPass) {
        // Pipeline Short-Circuited: Draw conspicuous SKIP BANNER in marking area
        ctx.save();
        const bannerW = 104;
        const bannerH = 42;
        const bannerX = centerX - bannerW / 2;
        const bannerY = centerY - bannerH / 2 + 4;

        ctx.fillStyle = "rgba(18, 12, 10, 0.92)";
        ctx.fillRect(bannerX, bannerY, bannerW, bannerH);

        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 2]);
        ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);
        ctx.setLineDash([]);

        ctx.textAlign = "center";
        ctx.font = "bold 7.5px monospace";
        ctx.fillStyle = "#fbbf24";
        ctx.fillText("⚡ RULE 2 SKIPPED", centerX, bannerY + 13);

        ctx.font = "6.5px monospace";
        ctx.fillStyle = "#fca5a5";
        ctx.fillText("Aborted: Pin 1 Check Failed", centerX, bannerY + 24);

        ctx.font = "6px monospace";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("0 / 24 boxes evaluated", centerX, bannerY + 34);
        ctx.restore();
      } else {
        // Rule 1 Passed: Render All 24 Individual Character Boxes
        ctx.save();
        ctx.translate(centerX, centerY);

        if (pocket.rotationDeg !== 0) {
          ctx.rotate((pocket.rotationDeg * Math.PI) / 180);
        }

        const boxes = res.rule2Pattern?.boxResults ?? [];

        // 1. Draw Pattern Envelope (Bounding ROI around laser marking features)
        const envX = -32;
        const envY = -20;
        const envW = 64;
        const envH = 50;

        ctx.strokeStyle = res.rule2Pattern?.isPass
          ? "rgba(6, 182, 212, 0.75)"
          : "rgba(244, 63, 94, 0.75)";
        ctx.lineWidth = 1.0;
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(envX, envY, envW, envH);
        ctx.setLineDash([]);

        // Envelope Header Tag
        ctx.font = "bold 6.5px monospace";
        ctx.fillStyle = res.rule2Pattern?.isPass ? "#22d3ee" : "#fda4af";
        ctx.textAlign = "left";
        ctx.fillText(
          `24-BOX [${res.rule2Pattern?.matchedCount ?? 24}/24 • ${res.rule2Pattern?.score ?? 100}%]`,
          envX + 2,
          envY - 2.5,
        );

        // 2. Draw all 24 individual character boxes with color-coded results
        for (const b of boxes) {
          const bX = -half + (b.relX / 100) * chipSize;
          const bY = -half + (b.relY / 100) * chipSize;
          const bW = (b.width / 100) * chipSize;
          const bH = (b.height / 100) * chipSize;

          if (b.isMatched) {
            ctx.strokeStyle = "#10b981";
            ctx.fillStyle = "rgba(16, 185, 129, 0.22)";
            ctx.lineWidth = 0.8;
            ctx.fillRect(bX, bY, bW, bH);
            ctx.strokeRect(bX, bY, bW, bH);

            ctx.font = "bold 5px monospace";
            ctx.fillStyle = "#34d399";
            ctx.textAlign = "center";
            ctx.fillText(b.label, bX + bW / 2, bY + bH - 1.0);
          } else {
            // Defective character box (abrasion/scratch/contrast failure)
            ctx.strokeStyle = "#ef4444";
            ctx.fillStyle = "rgba(239, 68, 68, 0.45)";
            ctx.lineWidth = 1.2;
            ctx.fillRect(bX, bY, bW, bH);
            ctx.strokeRect(bX, bY, bW, bH);

            // Red X mark
            ctx.beginPath();
            ctx.moveTo(bX + 1, bY + 1);
            ctx.lineTo(bX + bW - 1, bY + bH - 1);
            ctx.moveTo(bX + bW - 1, bY + 1);
            ctx.lineTo(bX + 1, bY + bH - 1);
            ctx.stroke();

            // Box number badge above defective box
            ctx.font = "bold 5px monospace";
            ctx.fillStyle = "#fecdd3";
            ctx.textAlign = "center";
            ctx.fillText(`#${b.boxNumber}`, bX + bW / 2, bY - 1.0);
          }
        }

        ctx.restore();
      }

      // ---------------------------------------------------------
      // DEVICE WIDTH Dimension Line (real edge-detected measurement)
      // Positioned BELOW the pocket boundary for clear visibility
      // ---------------------------------------------------------
      const measurement = deviceMeasurements[i];

      if (measurement) {
        // Edges are relative to pocket origin — convert to canvas coords
        const dimLeftX = x + measurement.leftEdgePx;
        const dimRightX = x + measurement.rightEdgePx;
        const dimY = y + height + 10;
        const dimCenterX = (dimLeftX + dimRightX) / 2;
        const serifH = 4;

        // Extension lines from device edges down to dimension line
        ctx.strokeStyle = "rgba(250, 204, 21, 0.35)";
        ctx.lineWidth = 0.5;
        ctx.setLineDash([2, 2]);

        ctx.beginPath();
        ctx.moveTo(dimLeftX, y + measurement.bottomEdgePx);
        ctx.lineTo(dimLeftX, dimY + serifH);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(dimRightX, y + measurement.bottomEdgePx);
        ctx.lineTo(dimRightX, dimY + serifH);
        ctx.stroke();

        ctx.setLineDash([]);

        ctx.strokeStyle = "rgba(250, 204, 21, 0.85)";
        ctx.fillStyle = "rgba(250, 204, 21, 0.9)";
        ctx.lineWidth = 0.8;

        // Left serif
        ctx.beginPath();
        ctx.moveTo(dimLeftX, dimY - serifH);
        ctx.lineTo(dimLeftX, dimY + serifH);
        ctx.stroke();

        // Right serif
        ctx.beginPath();
        ctx.moveTo(dimRightX, dimY - serifH);
        ctx.lineTo(dimRightX, dimY + serifH);
        ctx.stroke();

        // Horizontal line (left half)
        ctx.beginPath();
        ctx.moveTo(dimLeftX, dimY);
        ctx.lineTo(dimCenterX - 30, dimY);
        ctx.stroke();

        // Horizontal line (right half)
        ctx.beginPath();
        ctx.moveTo(dimCenterX + 30, dimY);
        ctx.lineTo(dimRightX, dimY);
        ctx.stroke();

        // Left arrowhead
        ctx.beginPath();
        ctx.moveTo(dimLeftX, dimY);
        ctx.lineTo(dimLeftX + 4, dimY - 2.5);
        ctx.lineTo(dimLeftX + 4, dimY + 2.5);
        ctx.closePath();
        ctx.fill();

        // Right arrowhead
        ctx.beginPath();
        ctx.moveTo(dimRightX, dimY);
        ctx.lineTo(dimRightX - 4, dimY - 2.5);
        ctx.lineTo(dimRightX - 4, dimY + 2.5);
        ctx.closePath();
        ctx.fill();

        // Dimension label (real measured value)
        const labelText = `Edge Width: ${measurement.widthMm.toFixed(1)}mm (${measurement.widthPx}px)`;
        ctx.font = "bold 7px monospace";
        ctx.textAlign = "center";
        const labelW = ctx.measureText(labelText).width + 8;
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(dimCenterX - labelW / 2, dimY - 6, labelW, 12);
        ctx.fillStyle = "#facc15";
        ctx.fillText(labelText, dimCenterX, dimY + 3);

        // Edge pitch measurement badge (below edge width)
        if (measurement.pinPitch) {
          const pp = measurement.pinPitch;
          const pinText = `Edge Pitch: ${pp.gapMm.toFixed(2)}mm (${pp.gapPx.toFixed(1)}px)`;
          ctx.font = "bold 6.5px monospace";
          const pinLabelW = ctx.measureText(pinText).width + 8;
          const pinBadgeY = dimY + 10;

          ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
          ctx.fillRect(dimCenterX - pinLabelW / 2, pinBadgeY, pinLabelW, 12);
          ctx.strokeStyle = "rgba(34, 211, 238, 0.6)";
          ctx.lineWidth = 0.6;
          ctx.strokeRect(dimCenterX - pinLabelW / 2, pinBadgeY, pinLabelW, 12);

          ctx.fillStyle = "#22d3ee";
          ctx.textAlign = "center";
          ctx.fillText(pinText, dimCenterX, pinBadgeY + 9);
        }
      }
    }
  }

  ctx.restore();
}
