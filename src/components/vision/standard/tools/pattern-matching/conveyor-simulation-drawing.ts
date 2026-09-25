import {
  ALL_ATMEL_BOX_NUMBERS,
  ATMEL_24_BOX_DEFINITIONS,
  buildAccuratePatternMatchResult,
} from "./atmel-chip-boxes";
import {
  drawMatchEnvelope,
  drawMatchedBoxItems,
} from "./pattern-match-canvas-drawing";
import {
  type CapturedPocketFrame,
  type DeviceChipType,
  type DeviceInspectionResult,
  type SimulationPhase,
  STM8_REAL_FAILED_BOX_NUMBERS,
} from "./useConveyorSimulation";

export interface ConveyorRenderParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  totalTravelPx: number;
  encoderTick: number;
  beltSpeedMmPerS: number;
  selectedDeviceIndex: number | null;
  deviceResults: Array<DeviceInspectionResult | null>;
  deviceChipTypes: readonly DeviceChipType[];
  chipGoodImg: HTMLImageElement | null;
  chipStm8Img: HTMLImageElement | null;
  phase?: SimulationPhase;
  capturedFrames?: Array<CapturedPocketFrame | null>;
  onDeviceAtInspection?: (deviceIndex: number) => void;
  onCapturePocket?: (deviceIndex: number) => void;
}

export const SIM_X_INSPECT = 700;
export const SIM_DEVICE_SPACING = 300;
export const SIM_POCKET_WIDTH = 200;
export const SIM_POCKET_HEIGHT = 200;
export const SIM_CHIP_WIDTH = 138;
export const SIM_CHIP_HEIGHT = 146;
export const TOTAL_DEVICES = 15;

export function drawConveyorSimulation(params: ConveyorRenderParams): void {
  const {
    ctx,
    width,
    height,
    totalTravelPx,
    encoderTick,
    beltSpeedMmPerS,
    selectedDeviceIndex,
    deviceResults,
    deviceChipTypes,
    phase = "capturing",
    capturedFrames = [],
  } = params;

  // 1. Factory Floor Background (Dark industrial machine bed)
  ctx.fillStyle = "#101216";
  ctx.fillRect(0, 0, width, height);

  // Subtle grid on factory floor
  ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
  ctx.lineWidth = 1;

  for (let gx = 0; gx < width; gx += 40) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, height);
    ctx.stroke();
  }

  for (let gy = 0; gy < height; gy += 40) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(width, gy);
    ctx.stroke();
  }

  // 2. Horizontal Pocket Carrier Belt (Left to Right)
  const beltH = 340;
  const by1 = Math.floor((height - beltH) / 2);
  const by2 = by1 + beltH;
  const centerY = Math.floor(height / 2);
  const inspectX = Math.floor(width / 2);

  // Belt track shadow on floor
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, by1 - 12, width, beltH + 24);

  // Antistatic Carrier Tape Surface (Dark matte composite)
  ctx.fillStyle = "#15181e";
  ctx.fillRect(0, by1, width, beltH);

  // Carrier tape longitudinal bevel grooves (top and bottom margins)
  ctx.strokeStyle = "#1e222b";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, by1 + 46);
  ctx.lineTo(width, by1 + 46);
  ctx.moveTo(0, by2 - 46);
  ctx.lineTo(width, by2 - 46);
  ctx.stroke();

  // Belt vertical texture micro-rib lines moving horizontally
  const textureSpacing = 24;
  const textureOffset = Math.floor(totalTravelPx) % textureSpacing;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
  ctx.lineWidth = 1;

  for (let tx = -textureSpacing + textureOffset; tx < width + textureSpacing; tx += textureSpacing) {
    ctx.beginPath();
    ctx.moveTo(tx, by1 + 48);
    ctx.lineTo(tx, by2 - 48);
    ctx.stroke();
  }

  // 3. Sprocket Indexing Round Holes along tape margins (top and bottom edge tractor feed)
  const marginHoleSpacing = 32;
  const marginHoleOffset = Math.floor(totalTravelPx) % marginHoleSpacing;
  const topHoleY = by1 + 23;
  const bottomHoleY = by2 - 23;

  for (
    let hx = -marginHoleSpacing + marginHoleOffset;
    hx < width + marginHoleSpacing;
    hx += marginHoleSpacing
  ) {
    if (hx >= -10 && hx <= width + 10) {
      // Outer metallic bevel rim
      ctx.fillStyle = "#252b36";
      ctx.beginPath();
      ctx.arc(hx, topHoleY, 7.5, 0, Math.PI * 2);
      ctx.arc(hx, bottomHoleY, 7.5, 0, Math.PI * 2);
      ctx.fill();

      // Inner perforation through-hole
      ctx.fillStyle = "#07080a";
      ctx.beginPath();
      ctx.arc(hx, topHoleY, 5.5, 0, Math.PI * 2);
      ctx.arc(hx, bottomHoleY, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Top-left highlight on hole rim
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hx - 1, topHoleY - 1, 5.5, Math.PI * 0.8, Math.PI * 1.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(hx - 1, bottomHoleY - 1, 5.5, Math.PI * 0.8, Math.PI * 1.6);
      ctx.stroke();
    }
  }

  // Outer Aluminum Tape Guides & Steel Rail Bolts (Top and Bottom)
  ctx.fillStyle = "#2b323e";
  ctx.fillRect(0, by1 - 20, width, 20);
  ctx.fillRect(0, by2, width, 20);

  ctx.strokeStyle = "#4b5668";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, by1 - 20);
  ctx.lineTo(width, by1 - 20);
  ctx.moveTo(0, by2 + 20);
  ctx.lineTo(width, by2 + 20);
  ctx.stroke();

  // Rail hex bolts
  ctx.fillStyle = "#718096";

  for (let xb = 30; xb < width; xb += 65) {
    ctx.beginPath();
    ctx.arc(xb, by1 - 10, 3.5, 0, Math.PI * 2);
    ctx.arc(xb, by2 + 10, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Optical Vision Camera Station at inspectX (Middle Gantry)
  // Gantry structural vertical beam
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.fillRect(inspectX - 42, 0, 84, height);

  // Gantry mounting brackets
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(inspectX - 46, by1 - 44, 92, 24);
  ctx.fillRect(inspectX - 46, by2 + 20, 92, 24);
  ctx.strokeStyle = "#00e5ff";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(inspectX - 46, by1 - 44, 92, 24);
  ctx.strokeRect(inspectX - 46, by2 + 20, 92, 24);

  // Dual High-Intensity LED Light Bars (Left and Right vertical illumination)
  ctx.fillStyle = "rgba(240, 249, 255, 0.9)";
  ctx.fillRect(inspectX - 36, by1 + 54, 5, beltH - 108);
  ctx.fillRect(inspectX + 31, by1 + 54, 5, beltH - 108);

  // LED Light Bar soft glows
  const ledGlow = ctx.createLinearGradient(inspectX - 36, 0, inspectX + 36, 0);
  ledGlow.addColorStop(0, "rgba(224, 242, 254, 0.2)");
  ledGlow.addColorStop(0.5, "rgba(0, 229, 255, 0.05)");
  ledGlow.addColorStop(1, "rgba(224, 242, 254, 0.2)");
  ctx.fillStyle = ledGlow;
  ctx.fillRect(inspectX - 34, by1 + 50, 68, beltH - 100);

  // Camera Optical Alignment Beam (Vertical laser trigger line)
  ctx.strokeStyle = "rgba(0, 229, 255, 0.4)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(inspectX, by1);
  ctx.lineTo(inspectX, by2);
  ctx.stroke();

  ctx.strokeStyle = "#00e5ff";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(inspectX, by1);
  ctx.lineTo(inspectX, by2);
  ctx.stroke();

  // Camera Lens Center Reticle [ + ]
  ctx.strokeStyle = "rgba(0, 229, 255, 0.9)";
  ctx.lineWidth = 2;
  ctx.strokeRect(inspectX - 110, centerY - 110, 220, 220);

  // Reticle Corner Guides
  const rSize = 16;
  const rx1 = inspectX - 110;
  const ry1 = centerY - 110;
  const rx2 = inspectX + 110;
  const ry2 = centerY + 110;
  ctx.strokeStyle = "#00e5ff";
  ctx.lineWidth = 3;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(rx1, ry1 + rSize);
  ctx.lineTo(rx1, ry1);
  ctx.lineTo(rx1 + rSize, ry1);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(rx2 - rSize, ry1);
  ctx.lineTo(rx2, ry1);
  ctx.lineTo(rx2, ry1 + rSize);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(rx1, ry2 - rSize);
  ctx.lineTo(rx1, ry2);
  ctx.lineTo(rx1 + rSize, ry2);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(rx2 - rSize, ry2);
  ctx.lineTo(rx2, ry2);
  ctx.lineTo(rx2, ry2 - rSize);
  ctx.stroke();

  // 5. Render 15 Recessed Pockets with Indexing Circles Between Them ("0 device 0")
  for (let i = 0; i < TOTAL_DEVICES; i += 1) {
    const pocketX = totalTravelPx - i * SIM_DEVICE_SPACING;

    // Draw circular locator hole "0" on the separator between adjacent pockets
    // "pocket means space between two circles 0 device 0"
    const dividerX = pocketX + SIM_DEVICE_SPACING / 2;

    if (dividerX >= -50 && dividerX <= width + 50) {
      // Outer metallic bevel rim for the indexing circle "0"
      ctx.fillStyle = "#262c37";
      ctx.beginPath();
      ctx.arc(dividerX, centerY, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#3e4859";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Deep through-hole perforation
      ctx.fillStyle = "#07080a";
      ctx.beginPath();
      ctx.arc(dividerX, centerY, 12, 0, Math.PI * 2);
      ctx.fill();

      // Inner bevel highlight
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(dividerX - 1, centerY - 1, 12, Math.PI * 0.75, Math.PI * 1.5);
      ctx.stroke();

      // Round index symbol text "0"
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Ø 12", dividerX, centerY - 24);
    }

    // Viewport clipping: skip pockets off-screen
    if (pocketX < -SIM_POCKET_WIDTH || pocketX > width + SIM_POCKET_WIDTH) {
      continue;
    }

    const chipType = deviceChipTypes[i] ?? "atmel";
    const isEmpty = chipType === "empty";
    const isStm8 = chipType === "stm8";
    const px1 = pocketX - SIM_POCKET_WIDTH / 2;
    const py1 = centerY - SIM_POCKET_HEIGHT / 2;

    const inspectedResult = deviceResults[i];
    const isInspected = inspectedResult !== null && inspectedResult !== undefined;
    const isSelected = selectedDeviceIndex === i;

    // Check if pocket is within camera strobe trigger zone (+/- 14px of inspectX)
    const isUnderCamera = Math.abs(pocketX - inspectX) < 14;

    // Strobe Flash Pulse when pocket crosses camera inspection line
    if (isUnderCamera) {
      // Intense high-speed strobe flash across gantry
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fillRect(inspectX - 90, by1 + 46, 180, beltH - 92);

      // Radial strobe glow
      const flash = ctx.createRadialGradient(
        inspectX,
        centerY,
        20,
        inspectX,
        centerY,
        180,
      );
      flash.addColorStop(0, "rgba(255, 255, 255, 0.8)");
      flash.addColorStop(0.3, "rgba(0, 229, 255, 0.4)");
      flash.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = flash;
      ctx.fillRect(inspectX - 180, centerY - 180, 360, 360);
    }

    // Trigger pocket capture once pocket center enters optical trigger zone
    if (isUnderCamera && pocketX >= inspectX - 5 && pocketX <= inspectX + 5) {
      if (params.onCapturePocket) {
        params.onCapturePocket(i);
      } else if (params.onDeviceAtInspection) {
        params.onDeviceAtInspection(i);
      }
    }

    // A. Recessed Molded Pocket Compartment ("pocket where device will be")
    // Pocket outer shadow on tape
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.beginPath();
    ctx.roundRect(px1 + 4, py1 + 6, SIM_POCKET_WIDTH, SIM_POCKET_HEIGHT, 14);
    ctx.fill();

    // Pocket cavity body (deep recessed mold)
    ctx.fillStyle = isSelected ? "#0c1524" : "#0a0c10";
    ctx.beginPath();
    ctx.roundRect(px1, py1, SIM_POCKET_WIDTH, SIM_POCKET_HEIGHT, 12);
    ctx.fill();

    // Pocket inner shadow gradient (recessed depth illusion)
    const pocketDepth = ctx.createLinearGradient(px1, py1, px1, py1 + SIM_POCKET_HEIGHT);
    pocketDepth.addColorStop(0, "rgba(0, 0, 0, 0.85)");
    pocketDepth.addColorStop(0.2, "rgba(0, 0, 0, 0.2)");
    pocketDepth.addColorStop(0.8, "rgba(0, 0, 0, 0.2)");
    pocketDepth.addColorStop(1, "rgba(255, 255, 255, 0.05)");
    ctx.fillStyle = pocketDepth;
    ctx.beginPath();
    ctx.roundRect(px1, py1, SIM_POCKET_WIDTH, SIM_POCKET_HEIGHT, 12);
    ctx.fill();

    // Pocket border bevel
    ctx.strokeStyle = isSelected
      ? "#00e5ff"
      : isInspected
      ? inspectedResult.isPass
        ? "rgba(16, 185, 129, 0.6)"
        : "rgba(244, 63, 94, 0.7)"
      : "#262c38";
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.roundRect(px1, py1, SIM_POCKET_WIDTH, SIM_POCKET_HEIGHT, 12);
    ctx.stroke();

    // Molded Pocket Pin-1 Orientation Notch (top-left corner index)
    ctx.fillStyle = "#1e2430";
    ctx.beginPath();
    ctx.arc(px1 + 16, py1 + 16, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#384152";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pocket ID Tag molded onto top lip
    const pocketTag = `POCKET #${String(i + 1).padStart(2, "0")}`;
    ctx.fillStyle = isSelected ? "#00e5ff" : "#64748b";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText(pocketTag, pocketX, py1 + 15);

    // B. IC Device Seated Inside the Pocket or Empty Pocket Nest
    const cx1 = pocketX - SIM_CHIP_WIDTH / 2;
    const cy1 = centerY - SIM_CHIP_HEIGHT / 2 + 8; // slight offset for pocket tag

    if (isEmpty) {
      // Empty Pocket Nest ("sometimes pocket can be empty")
      ctx.fillStyle = "#06080a";
      ctx.beginPath();
      ctx.roundRect(cx1 + 6, cy1 + 6, SIM_CHIP_WIDTH - 12, SIM_CHIP_HEIGHT - 12, 6);
      ctx.fill();

      // Pocket bed alignment crosshatch
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx1 + 12, cy1 + (SIM_CHIP_HEIGHT - 12) / 2 + 6);
      ctx.lineTo(cx1 + SIM_CHIP_WIDTH - 18, cy1 + (SIM_CHIP_HEIGHT - 12) / 2 + 6);
      ctx.moveTo(cx1 + (SIM_CHIP_WIDTH - 12) / 2 + 6, cy1 + 12);
      ctx.lineTo(cx1 + (SIM_CHIP_WIDTH - 12) / 2 + 6, cy1 + SIM_CHIP_HEIGHT - 18);
      ctx.stroke();

      // Embossed "EMPTY NEST" text molded into cavity bed
      ctx.fillStyle = "#475569";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText("EMPTY NEST", pocketX, centerY - 2);

      ctx.fillStyle = "#334155";
      ctx.font = "9px monospace";
      ctx.fillText("[NO COMPONENT]", pocketX, centerY + 14);
    } else {
      // Chip shadow inside the recessed pocket
      ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
      ctx.beginPath();
      ctx.roundRect(cx1 + 4, cy1 + 5, SIM_CHIP_WIDTH, SIM_CHIP_HEIGHT, 6);
      ctx.fill();

      // Draw chip sprite: Good Atmel chip vs STM8 chip
      const chipImg = isStm8 ? params.chipStm8Img : params.chipGoodImg;

      if (chipImg && chipImg.complete) {
        ctx.drawImage(chipImg, cx1, cy1, SIM_CHIP_WIDTH, SIM_CHIP_HEIGHT);
      } else {
        ctx.fillStyle = isStm8 ? "#202020" : "#2d2d2d";
        ctx.beginPath();
        ctx.roundRect(cx1, cy1, SIM_CHIP_WIDTH, SIM_CHIP_HEIGHT, 6);
        ctx.fill();
        ctx.fillStyle = "#e0e0e0";
        ctx.font = "bold 10px monospace";
        ctx.fillText(isStm8 ? "STM8S208" : "MEGA32U4", cx1 + 22, cy1 + 55);
      }

      // Chip package perimeter highlight
      ctx.strokeStyle = isInspected
        ? inspectedResult.isPass
          ? "rgba(16, 185, 129, 0.85)"
          : "rgba(244, 63, 94, 0.9)"
        : "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx1, cy1, SIM_CHIP_WIDTH, SIM_CHIP_HEIGHT);
    }

    // C. Pocket Status & Inspection Badges
    const isCaptured = capturedFrames[i] !== null && capturedFrames[i] !== undefined;

    if (isUnderCamera) {
      // Flashing capture shutter banner
      ctx.fillStyle = "#00e5ff";
      ctx.fillRect(pocketX - 65, py1 + SIM_POCKET_HEIGHT - 22, 130, 18);
      ctx.fillStyle = "#000000";
      ctx.font = "black 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("📸 CAPTURING...", pocketX, py1 + SIM_POCKET_HEIGHT - 10);
    } else if (isInspected) {
      // Phase 2 / Evaluated Result Badge
      if (isEmpty) {
        const badgeW = 138;
        const badgeH = 18;
        ctx.fillStyle = "rgba(225, 29, 72, 0.95)";
        ctx.fillRect(pocketX - badgeW / 2, py1 + SIM_POCKET_HEIGHT - 22, badgeW, badgeH);
        ctx.strokeStyle = "#fb7185";
        ctx.lineWidth = 1;
        ctx.strokeRect(pocketX - badgeW / 2, py1 + SIM_POCKET_HEIGHT - 22, badgeW, badgeH);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("✗ EMPTY POCKET (0.0%)", pocketX, py1 + SIM_POCKET_HEIGHT - 10);
      } else {
        const hasPassed = inspectedResult.isPass;
        const badgeText = hasPassed
          ? `✓ PASS 100%`
          : `✗ REJECT (${inspectedResult.score.toFixed(1)}%)`;
        const badgeBg = hasPassed ? "rgba(5, 150, 105, 0.95)" : "rgba(225, 29, 72, 0.95)";
        const badgeW = 126;
        const badgeH = 18;

        ctx.fillStyle = badgeBg;
        ctx.fillRect(pocketX - badgeW / 2, py1 + SIM_POCKET_HEIGHT - 22, badgeW, badgeH);
        ctx.strokeStyle = hasPassed ? "#34d399" : "#fb7185";
        ctx.lineWidth = 1;
        ctx.strokeRect(pocketX - badgeW / 2, py1 + SIM_POCKET_HEIGHT - 22, badgeW, badgeH);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(badgeText, pocketX, py1 + SIM_POCKET_HEIGHT - 10);
      }
    } else if (isCaptured) {
      // Phase 1 Captured Badge
      ctx.fillStyle = "rgba(6, 182, 212, 0.85)";
      ctx.fillRect(pocketX - 55, py1 + SIM_POCKET_HEIGHT - 22, 110, 18);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("CAPTURED", pocketX, py1 + SIM_POCKET_HEIGHT - 10);
    } else {
      // Waiting in queue badge
      ctx.fillStyle = "rgba(51, 65, 85, 0.7)";
      ctx.fillRect(pocketX - 50, py1 + SIM_POCKET_HEIGHT - 22, 100, 18);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText("IN QUEUE", pocketX, py1 + SIM_POCKET_HEIGHT - 10);
    }

    ctx.textAlign = "start";

    // D. True Machine Vision Box Overlays (Only for populated devices)
    const isViewingInspection =
      !isEmpty && (isSelected || (isInspected && Math.abs(pocketX - inspectX) < 70));

    if (isViewingInspection) {
      const accurateMatch =
        inspectedResult?.matchResult ??
        (isStm8
          ? buildAccuratePatternMatchResult({
              chipX: cx1,
              chipY: cy1,
              hasDefect: true,
              defectBoxNumbers: STM8_REAL_FAILED_BOX_NUMBERS,
            })
          : buildAccuratePatternMatchResult({
              chipX: cx1,
              chipY: cy1,
              hasDefect: false,
              defectBoxNumbers: [],
            }));

      const bodyX = cx1 + Math.round((SIM_CHIP_WIDTH * 9) / 140);
      const bodyY = cy1 + Math.round((SIM_CHIP_HEIGHT * 10) / 148);
      const bodyW = Math.round((SIM_CHIP_WIDTH * 122) / 140);
      const bodyH = Math.round((SIM_CHIP_HEIGHT * 122) / 148);

      const scaleX = bodyW / 100;
      const scaleY = bodyH / 100;

      let bMinX = Number.POSITIVE_INFINITY;
      let bMinY = Number.POSITIVE_INFINITY;
      let bMaxX = Number.NEGATIVE_INFINITY;
      let bMaxY = Number.NEGATIVE_INFINITY;

      const adjustedBoxes = accurateMatch.boxResults.map((b) => {
        const def = ATMEL_24_BOX_DEFINITIONS[b.boxNumber - 1];
        const baseRelX = def ? def.relX : b.referenceX;
        const baseRelY = def ? def.relY : b.referenceY;
        const baseW = def ? def.width : b.width;
        const baseH = def ? def.height : b.height;
        const relX = Math.round(baseRelX * scaleX);
        const relY = Math.round(baseRelY * scaleY);
        const boxW = Math.max(2, Math.round(baseW * scaleX));
        const boxH = Math.max(2, Math.round(baseH * scaleY));
        const finalX = bodyX + relX;
        const finalY = bodyY + relY;

        bMinX = Math.min(bMinX, finalX);
        bMinY = Math.min(bMinY, finalY);
        bMaxX = Math.max(bMaxX, finalX + boxW);
        bMaxY = Math.max(bMaxY, finalY + boxH);

        return {
          ...b,
          width: boxW,
          height: boxH,
          referenceX: finalX,
          referenceY: finalY,
          matchedX: finalX,
          matchedY: finalY,
        };
      });

      const adjustedMatch = {
        ...accurateMatch,
        patternBounds: {
          x: bMinX - 4,
          y: bMinY - 4,
          width: Math.max(1, bMaxX - bMinX + 8),
          height: Math.max(1, bMaxY - bMinY + 8),
        },
        boxResults: adjustedBoxes,
      };

      drawMatchEnvelope(ctx, adjustedMatch);
      drawMatchedBoxItems(ctx, adjustedBoxes);
    }
  }

  // 6. Top Industrial HUD Bar
  ctx.fillStyle = "#0c0e12";
  ctx.fillRect(0, 0, width, 32);
  ctx.strokeStyle = "#1e2430";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 32);
  ctx.lineTo(width, 32);
  ctx.stroke();

  // Status Indicator
  const isPhaseCompleted = phase === "completed";
  ctx.fillStyle = isPhaseCompleted ? "#00e676" : "#00e5ff";
  ctx.beginPath();
  ctx.arc(16, 16, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f1f5f9";
  ctx.font = "bold 11px monospace";
  const titleText = isPhaseCompleted
    ? "HORIZONTAL POCKET CONVEYOR - 15/15 EVALUATED"
    : phase === "evaluating"
    ? "HORIZONTAL POCKET CONVEYOR - EVALUATING POCKETS..."
    : "HORIZONTAL POCKET CONVEYOR - PHASE 1: SEQUENTIAL POCKET CAPTURE";
  ctx.fillText(titleText, 28, 20);

  ctx.fillStyle = "#00e5ff";
  ctx.fillText(`BELT SPEED: ${beltSpeedMmPerS.toFixed(1)} mm/s`, width - 320, 20);

  ctx.fillStyle = "#94a3b8";
  ctx.fillText("CAM: Basler Vision 60 FPS", width - 150, 20);

  // 7. Bottom Telemetry Bar
  ctx.fillStyle = "#0c0e12";
  ctx.fillRect(0, height - 30, width, 30);
  ctx.strokeStyle = "#1e2430";
  ctx.beginPath();
  ctx.moveTo(0, height - 30);
  ctx.lineTo(width, height - 30);
  ctx.stroke();

  ctx.fillStyle = "#00e676";
  ctx.font = "11px monospace";
  ctx.fillText(`ENCODER: ${encoderTick} TICKS`, 16, height - 11);

  const completed = deviceResults.filter((r) => r !== null).length;
  const captured = capturedFrames.filter((f) => f !== null).length;
  ctx.fillStyle = "#f1f5f9";
  ctx.fillText(
    `POCKETS CAPTURED: ${captured} / ${TOTAL_DEVICES} | EVALUATED: ${completed} / ${TOTAL_DEVICES}`,
    Math.floor(width * 0.32),
    height - 11,
  );

  ctx.fillStyle = "#00e5ff";
  ctx.fillText("HORIZONTAL EMBOSSED CARRIER TAPE", width - 265, height - 11);
}
