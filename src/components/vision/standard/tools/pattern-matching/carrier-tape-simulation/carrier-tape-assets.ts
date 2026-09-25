import { REAL_ATMEL_CHIP_DATA_URL } from "../chip-assets";
import type { CarrierTapeFrame, PocketDef, CarrierTapeVariation } from "./types";

import click1 from "../../../../../../../assets/preview/camera_pocket_click_1.jpg";
import click2 from "../../../../../../../assets/preview/camera_pocket_click_2.jpg";
import click3 from "../../../../../../../assets/preview/camera_pocket_click_3.jpg";
import click4 from "../../../../../../../assets/preview/camera_pocket_click_4.jpg";
import click5 from "../../../../../../../assets/preview/camera_pocket_click_5.jpg";
import click6 from "../../../../../../../assets/preview/camera_pocket_click_6.jpg";
import click7 from "../../../../../../../assets/preview/camera_pocket_click_7.jpg";
import click8 from "../../../../../../../assets/preview/camera_pocket_click_8.jpg";
import click9 from "../../../../../../../assets/preview/camera_pocket_click_9.jpg";
import click10 from "../../../../../../../assets/preview/camera_pocket_click_10.jpg";
import click11 from "../../../../../../../assets/preview/camera_pocket_click_11.jpg";
import click12 from "../../../../../../../assets/preview/camera_pocket_click_12.jpg";
import click13 from "../../../../../../../assets/preview/camera_pocket_click_13.jpg";
import click14 from "../../../../../../../assets/preview/camera_pocket_click_14.jpg";
import click15 from "../../../../../../../assets/preview/camera_pocket_click_15.jpg";

export const FRAME_IMAGE_URLS: Record<number, string> = {
  1: click1,
  2: click2,
  3: click3,
  4: click4,
  5: click5,
  6: click6,
  7: click7,
  8: click8,
  9: click9,
  10: click10,
  11: click11,
  12: click12,
  13: click13,
  14: click14,
  15: click15,
};

export const CARRIER_TAPE_WIDTH = 512;
export const CARRIER_TAPE_HEIGHT = 288;

export const CLEAN_UNCUTOFF_POCKET_DATA_URL = 'data:image/png;base64,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';

let cleanPocketImg: HTMLImageElement | null = null;

export function getCachedPocketImage(): HTMLImageElement | null {
  if (typeof window === "undefined" || typeof Image === "undefined") {
    return null;
  }

  if (!cleanPocketImg) {
    cleanPocketImg = new Image();
    cleanPocketImg.src = CLEAN_UNCUTOFF_POCKET_DATA_URL;
  }

  return cleanPocketImg;
}

let realAtmelImg: HTMLImageElement | null = null;

export function getCachedChipImage(): HTMLImageElement | null {
  if (typeof window === "undefined" || typeof Image === "undefined") {
    return null;
  }

  if (!realAtmelImg) {
    realAtmelImg = new Image();
    realAtmelImg.src = REAL_ATMEL_CHIP_DATA_URL;
  }

  return realAtmelImg;
}

// 15 Discrete Camera Pocket Click Frame Images
const frameImagesCache: Record<number, HTMLImageElement> = {};

export function getCachedFrameImage(frameNumber: number): HTMLImageElement | null {
  if (typeof window === "undefined" || typeof Image === "undefined") {
    return null;
  }

  if (!frameImagesCache[frameNumber]) {
    const src = FRAME_IMAGE_URLS[frameNumber];

    if (!src) {
      return null;
    }

    const img = new Image();
    img.src = src;
    frameImagesCache[frameNumber] = img;
  }

  return frameImagesCache[frameNumber];
}

export function preloadAllFrameImages(): void {
  if (typeof window === "undefined" || typeof Image === "undefined") {
    return;
  }

  for (let f = 1; f <= 15; f += 1) {
    getCachedFrameImage(f);
  }
}

// Exact 512x288 16:9 machine vision pocket coordinates (Option A tight inside cavity boundary)
export const POCKET_GEOMETRY = [
  { pocketIndex: 0, x: 36, y: 68, width: 141, height: 152 },
  { pocketIndex: 1, x: 186, y: 68, width: 141, height: 152 },
  { pocketIndex: 2, x: 336, y: 68, width: 141, height: 152 },
] as const;

export function build15FrameSequence(): CarrierTapeFrame[] {
  const frames: CarrierTapeFrame[] = [];

  const variations: CarrierTapeVariation[] = [
    "empty-device-device",
    "device-device-empty",
    "device-empty-device",
  ];

  for (let f = 1; f <= 15; f += 1) {
    const variationIndex = (f - 1) % 3;
    const variation = variations[variationIndex];

    let lighting = 1.0;
    let description = `Frame ${f}: Baseline Normal (${variation})`;

    const pockets: [PocketDef, PocketDef, PocketDef] = [
      {
        ...POCKET_GEOMETRY[0],
        occupancy: variation === "empty-device-device" ? "empty" : "device",
        rotationDeg: 0,
        chipModel: "atmel",
        hasPin1Dot: true,
        pin1Corner: "top-left",
        hasLaserDefect: false,
      },
      {
        ...POCKET_GEOMETRY[1],
        occupancy: variation === "device-empty-device" ? "empty" : "device",
        rotationDeg: 0,
        chipModel: "atmel",
        hasPin1Dot: true,
        pin1Corner: "top-left",
        hasLaserDefect: false,
      },
      {
        ...POCKET_GEOMETRY[2],
        occupancy: variation === "device-device-empty" ? "empty" : "device",
        rotationDeg: 0,
        chipModel: "atmel",
        hasPin1Dot: true,
        pin1Corner: "top-left",
        hasLaserDefect: false,
      },
    ];

    // Frame specific anomalies
    if (f === 4) {
      // Slight rotation within tolerance
      description = "Frame 4: Slight Angular Drift (+5.5° tilt on Pocket 2, within 10° tolerance)";
      pockets[2].rotationDeg = 5.5;
    } else if (f === 5) {
      // Underexposed lighting
      lighting = 0.65;
      description = "Frame 5: Low-Light Illumination Shift (-35% lighting level)";
    } else if (f === 6) {
      // Overexposed lighting
      lighting = 1.4;
      description = "Frame 6: High-Glare Illumination Shift (+40% lighting level)";
    } else if (f === 7) {
      // Severe rotation exceeding tolerance -> Rule 1 Fail
      description = "Frame 7: Severe Angular Misalignment (+13.8° tilt on Pocket 2, exceeds 10° tolerance)";
      pockets[2].rotationDeg = 13.8;
    } else if (f === 8) {
      // Inverted 180° orientation -> Rule 1 Fail (Pin 1 dot bottom-right)
      description = "Frame 8: Inverted 180° Part Orientation on Pocket 0 (Pin 1 dot opposite corner)";
      pockets[0].rotationDeg = 180;
      pockets[0].pin1Corner = "bottom-right";
    } else if (f === 9) {
      // 90° Clockwise rotation -> Rule 1 Fail
      description = "Frame 9: 90° Rotated Part on Pocket 0 (Pin 1 dot top-right)";
      pockets[0].rotationDeg = 90;
      pockets[0].pin1Corner = "top-right";
    } else if (f === 10) {
      // Laser marking defect on Atmel chip -> Rule 1 OK, Rule 2 Pattern Fail
      description = "Frame 10: Laser Marking Print Abrasion on Pocket 1 (Text partially destroyed)";
      pockets[1].hasLaserDefect = true;
    } else if (f === 11) {
      // Laser marking abrasion -> Rule 1 OK, Rule 2 Pattern Fail
      description = "Frame 11: Laser Print Scratch / Abrasion on Pocket 1 (Text partially destroyed)";
      pockets[1].hasLaserDefect = true;
    } else if (f === 12) {
      description = "Frame 12: Normal Production Baseline (Clean pockets)";
    } else if (f === 13) {
      // Minor rotation (+4°) within tolerance
      description = "Frame 13: Normal Vibration (+4.0° tilt on Pocket 1, within 10° tolerance)";
      pockets[1].rotationDeg = 4.0;
    } else if (f === 14) {
      // Missing Pin 1 dot -> Rule 1 Fail
      description = "Frame 14: Mold Defect on Pocket 0 (Pin 1 Index Dimple Missing)";
      pockets[0].hasPin1Dot = false;
    } else if (f === 15) {
      // Laser ablation scratch on Atmel chip -> Rule 1 OK, Rule 2 Pattern Fail
      description = "Frame 15: Laser Print Scratch & Burn on Pocket 2 (Text contrast failed)";
      pockets[2].hasLaserDefect = true;
    }

    frames.push({
      frameNumber: f,
      variation,
      lightingMultiplier: lighting,
      description,
      pockets,
      results: [null as any, null as any, null as any],
    });
  }

  return frames;
}

export function drawCameraClickFrame(
  ctx: CanvasRenderingContext2D,
  frame: CarrierTapeFrame,
): void {
  const img = getCachedFrameImage(frame.frameNumber);

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, 0, 0, CARRIER_TAPE_WIDTH, CARRIER_TAPE_HEIGHT);
  } else {
    drawFallbackFrame(ctx, frame);
  }
}

export function drawFallbackFrame(
  ctx: CanvasRenderingContext2D,
  frame: CarrierTapeFrame,
): void {
  // 1. Industrial factory floor dark field
  ctx.fillStyle = "#161920";
  ctx.fillRect(0, 0, CARRIER_TAPE_WIDTH, CARRIER_TAPE_HEIGHT);

  // 2. Extruded guide rails
  ctx.fillStyle = "#262b37";
  ctx.fillRect(0, 44, CARRIER_TAPE_WIDTH, 16);
  ctx.fillRect(0, 228, CARRIER_TAPE_WIDTH, 16);

  // 3. Draw 3 machine vision pockets
  for (let i = 0; i < 3; i += 1) {
    drawSinglePocket(ctx, frame.pockets[i], frame.lightingMultiplier);
  }
}

// Retain for compatibility with existing imports
export function drawTapeAndPockets(
  ctx: CanvasRenderingContext2D,
  frame: CarrierTapeFrame,
): void {
  drawCameraClickFrame(ctx, frame);
}

export function drawTapeBackground(
  ctx: CanvasRenderingContext2D,
): void {
  ctx.fillStyle = "#161920";
  ctx.fillRect(0, 0, CARRIER_TAPE_WIDTH, CARRIER_TAPE_HEIGHT);
}

export function drawFramePockets(
  ctx: CanvasRenderingContext2D,
  frame: CarrierTapeFrame,
): void {
  for (let i = 0; i < 3; i += 1) {
    drawSinglePocket(ctx, frame.pockets[i], frame.lightingMultiplier);
  }
}

function drawSinglePocket(
  ctx: CanvasRenderingContext2D,
  pocket: PocketDef,
  lighting: number,
): void {
  const { x, y, width, height, occupancy } = pocket;

  ctx.save();

  const pocketImg = getCachedPocketImage();

  if (pocketImg && pocketImg.complete && pocketImg.naturalWidth > 0) {
    ctx.drawImage(pocketImg, x, y, width, height);
  } else {
    ctx.fillStyle = "#12151b";
    ctx.strokeStyle = "#252b37";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 4);
    ctx.fill();
    ctx.stroke();
  }

  if (occupancy === "empty") {
    ctx.fillStyle = "rgba(100, 116, 139, 0.45)";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("EMPTY POCKET", x + width / 2, y + height / 2 - 4);
    ctx.font = "8px monospace";
    ctx.fillText("NO COMPONENT", x + width / 2, y + height / 2 + 10);
  } else {
    drawSeatedChip(ctx, pocket, x, y, width, height, lighting);
  }

  ctx.restore();
}

function drawSeatedChip(
  ctx: CanvasRenderingContext2D,
  pocket: PocketDef,
  x: number,
  y: number,
  width: number,
  height: number,
  lighting: number,
): void {
  // Cavity center inside uncutoff pocket is at (68, 76)
  const centerX = x + 68;
  const centerY = y + 76;

  ctx.save();
  ctx.translate(centerX, centerY);

  if (pocket.rotationDeg !== 0) {
    ctx.rotate((pocket.rotationDeg * Math.PI) / 180);
  }

  // Option A: Confirmed tight inside boundary chip size = 92px
  const chipRenderSize = 92;
  const half = chipRenderSize / 2;

  if (lighting !== 1.0) {
    ctx.filter = `brightness(${lighting})`;
  }

  const chipImg = getCachedChipImage();

  if (chipImg && chipImg.complete && chipImg.naturalWidth > 0) {
    ctx.drawImage(chipImg, -half, -half, chipRenderSize, chipRenderSize);
  } else {
    drawFallbackRealisticChip(ctx, pocket, half, lighting);
  }

  ctx.filter = "none";

  // Frame 14 anomaly: Missing Pin 1 Dimple
  if (!pocket.hasPin1Dot) {
    const dotMarginX = -27.0;
    const dotMarginY = -28.0;

    ctx.fillStyle = "#2c2d30";
    ctx.beginPath();
    ctx.arc(dotMarginX, dotMarginY, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Laser defect anomaly
  if (pocket.hasLaserDefect) {
    ctx.strokeStyle = "rgba(220, 38, 38, 0.9)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-18, -6);
    ctx.lineTo(18, 8);
    ctx.moveTo(-8, -10);
    ctx.lineTo(12, 14);
    ctx.stroke();
  }

  ctx.restore();
}

function drawFallbackRealisticChip(
  ctx: CanvasRenderingContext2D,
  pocket: PocketDef,
  half: number,
  lighting: number,
): void {
  // 44 Metallic Pins
  const pinsPerSide = 11;
  const pinLength = 8;
  const pinWidth = 2;
  const span = half * 2 - 12;
  const step = span / (pinsPerSide - 1);

  ctx.fillStyle = lighting > 1.2 ? "#ffffff" : lighting < 0.8 ? "#94a3b8" : "#cbd5e1";
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 0.5;

  for (let i = 0; i < pinsPerSide; i += 1) {
    const offset = -span / 2 + i * step;
    ctx.fillRect(offset - pinWidth / 2, -half - pinLength, pinWidth, pinLength);
    ctx.fillRect(offset - pinWidth / 2, half, pinWidth, pinLength);
    ctx.fillRect(-half - pinLength, offset - pinWidth / 2, pinLength, pinWidth);
    ctx.fillRect(half, offset - pinWidth / 2, pinLength, pinWidth);
  }

  // Matte Plastic Package
  const lumaBase = Math.round(24 * lighting);
  ctx.fillStyle = `rgb(${lumaBase}, ${lumaBase + 2}, ${lumaBase + 5})`;
  ctx.strokeStyle = `rgb(${lumaBase + 25}, ${lumaBase + 28}, ${lumaBase + 35})`;
  ctx.lineWidth = 1.0;

  ctx.beginPath();
  const chamfer = 6;
  ctx.moveTo(-half + chamfer, -half);
  ctx.lineTo(half - chamfer, -half);
  ctx.lineTo(half, -half + chamfer);
  ctx.lineTo(half, half - chamfer);
  ctx.lineTo(half - chamfer, half);
  ctx.lineTo(-half + chamfer, half);
  ctx.lineTo(-half, half - chamfer);
  ctx.lineTo(-half, -half + chamfer);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Pin 1 Circular Dot
  if (pocket.hasPin1Dot) {
    let dotX = -27.0;
    let dotY = -28.0;

    if (pocket.pin1Corner === "top-right") {
      dotX = 28.0;
      dotY = -27.0;
    } else if (pocket.pin1Corner === "bottom-left") {
      dotX = -28.0;
      dotY = 27.0;
    } else if (pocket.pin1Corner === "bottom-right") {
      dotX = 27.0;
      dotY = 28.0;
    }

    ctx.fillStyle = "#0f1117";
    ctx.strokeStyle = "#384252";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Markings
  const textLuma = Math.min(255, Math.round(180 * lighting));
  ctx.fillStyle = `rgb(${textLuma}, ${textLuma}, ${textLuma})`;
  ctx.font = "bold 7px sans-serif";
  ctx.textAlign = "center";

  ctx.fillText("AIMEL", 0, -14);
  ctx.font = "bold 6.5px monospace";
  ctx.fillText("MEGA32U4", 0, -4);
  ctx.font = "6px monospace";
  ctx.fillText("-AU 1035E", 0, 6);
  ctx.fillText("0G3455", 0, 15);
}
