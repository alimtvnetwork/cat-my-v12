import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Eye,
  EyeOff,
  Maximize,
  Sliders,
  Sparkles,
  ZoomIn,
  ZoomOut,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ListChecks,
  Loader2,
  ScanSearch,
} from "lucide-react";
import { markWhiteBoxes, type WhiteBoxMark } from "@/lib/vision/white-box-marking";
import {
  drawPatternBoxes,
  drawFormulatedEnvelope,
  drawToleranceZones,
} from "../white-box/canvas-drawing";
import { computePatternGeometry } from "../white-box/pattern-geometry";
import type { EditorRule } from "@/lib/editor/types";
import {
  registerWorkpieceImageCache,
  parseBoxesFromParams,
  getContainedDimensions,
  type TapeStripEvaluationResult,
  type PocketEvaluationResult,
} from "@/lib/vision/workpiece-rule-analyzer";

export interface WorkpieceRoi {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RuleValidationDetail {
  status: "pass" | "fail" | "warn" | "pending" | "skipped";
  score?: number;
  message?: string;
}

export interface VisualToolWorkpieceCanvasProps {
  imageRef?: string;
  roi?: WorkpieceRoi;
  onChangeRoi?: (next: WorkpieceRoi) => void;
  toolCode?: string;
  toolName?: string;
  toolParams?: Record<string, string | number | boolean | undefined>;
  isEditable?: boolean;
  isAnalyzeMode?: boolean;
  overlayRules?: readonly EditorRule[];
  selectedRuleId?: string;
  onSelectRule?: (id: string) => void;
  onLaunchPatternTuner?: () => void;
  onPatternBoxesChange?: (boxes: WhiteBoxMark[], constellation: any[]) => void;
  actionSlot?: React.ReactNode;
  validationStatus?: "pass" | "fail" | "warn" | "pending" | "skipped";
  validationScore?: number;
  validationResultsMap?: Record<string, RuleValidationDetail>;
  onRunAnalysis?: () => void;
  isAnalyzing?: boolean;
  tapeStripResult?: TapeStripEvaluationResult | null;
  onUpdateParams?: (params: Record<string, any>) => void;
}

function clampValue(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function drawNoImagePlaceholder(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "#080b0f";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
  ctx.lineWidth = 1;

  for (let x = 0; x < w; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  for (let y = 0; y < h; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
  ctx.fillRect(w / 2 - 190, h / 2 - 34, 380, 68);
  ctx.strokeStyle = "rgba(100, 116, 139, 0.55)";
  ctx.strokeRect(w / 2 - 190, h / 2 - 34, 380, 68);
  ctx.textAlign = "center";
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("No project image registered", w / 2, h / 2 - 5);
  ctx.fillStyle = "#64748b";
  ctx.font = "11px sans-serif";
  ctx.fillText("Register or capture an image to run visual analysis.", w / 2, h / 2 + 16);
  ctx.textAlign = "left";
}

function drawCompletePatternOverlay(
  ctx: CanvasRenderingContext2D,
  boxes: readonly WhiteBoxMark[],
  excludedNumbers: ReadonlySet<number>,
  status?: "pass" | "fail" | "warn" | "pending" | "skipped",
  marginPx = 8,
  imageWidth = 960,
  imageHeight = 540,
): void {
  if (boxes.length === 0) {
    return;
  }

  const geometry = computePatternGeometry({
    boxes,
    excludedNumbers,
    marginPx,
    tolerancePx: marginPx,
    imageWidth,
    imageHeight,
  });

  if (geometry && geometry.toleranceZones.length > 0) {
    drawToleranceZones(ctx, geometry.toleranceZones);
  }

  drawPatternBoxes(ctx, boxes, excludedNumbers, status === "skipped" ? "pending" : status);

  if (geometry) {
    drawFormulatedEnvelope(ctx, geometry, status === "skipped" ? "pending" : status);
  }
}

function drawRealBoxes(
  ctx: CanvasRenderingContext2D,
  boxes: readonly WhiteBoxMark[],
  excludedNumbers: ReadonlySet<number>,
  status?: "pass" | "fail" | "warn" | "pending" | "skipped",
  marginPx = 8,
  imageWidth = 960,
  imageHeight = 540,
): void {
  drawCompletePatternOverlay(
    ctx,
    boxes,
    excludedNumbers,
    status,
    marginPx,
    imageWidth,
    imageHeight,
  );
}

function drawGreyscaleSimulationPatternOverlay(
  ctx: CanvasRenderingContext2D,
  ruleRoi: WorkpieceRoi,
  boxes: readonly WhiteBoxMark[],
  status?: "pass" | "fail" | "warn" | "pending" | "skipped",
  score?: number,
  boxResults?: any[],
  isAnalyzeMode = false,
  isSkipped = false,
): void {
  ctx.save();

  if (isSkipped) {
    const bannerW = Math.min(ruleRoi.width, 180);
    const bannerH = Math.min(ruleRoi.height, 46);
    const bannerX = ruleRoi.x + (ruleRoi.width - bannerW) / 2;
    const bannerY = ruleRoi.y + (ruleRoi.height - bannerH) / 2;

    ctx.fillStyle = "rgba(18, 12, 10, 0.92)";
    ctx.fillRect(bannerX, bannerY, bannerW, bannerH);

    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 2]);
    ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);
    ctx.setLineDash([]);

    ctx.textAlign = "center";
    ctx.font = "bold 8.5px monospace";
    ctx.fillStyle = "#fbbf24";
    ctx.fillText("⚡ RULE 2 SKIPPED", bannerX + bannerW / 2, bannerY + 14);

    ctx.font = "7.5px monospace";
    ctx.fillStyle = "#fca5a5";
    ctx.fillText("Aborted: Pin 1 Check Failed", bannerX + bannerW / 2, bannerY + 26);

    ctx.font = "7px monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("0 / 24 boxes evaluated", bannerX + bannerW / 2, bannerY + 38);
    ctx.restore();

    return;
  }

  if (boxes.length === 0) {
    ctx.restore();

    return;
  }

  const isPass = status === "pass";
  const isFail = status === "fail";
  const matchedBoxesMap = new Map<number, boolean>();

  if (Array.isArray(boxResults) && boxResults.length > 0) {
    for (const br of boxResults) {
      matchedBoxesMap.set(br.boxNumber, Boolean(br.isMatched));
    }
  }

  let matchedCount = 0;
  const totalCount = boxes.length;

  for (const b of boxes) {
    const isMatched = matchedBoxesMap.has(b.number)
      ? Boolean(matchedBoxesMap.get(b.number))
      : isPass || status === undefined;

    if (isMatched) {
      matchedCount += 1;
    }
  }

  const scorePct =
    typeof score === "number"
      ? Math.round(score * 100)
      : Math.round((matchedCount / totalCount) * 100);

  let envX = ruleRoi.x;
  let envY = ruleRoi.y;
  let envW = ruleRoi.width;
  let envH = ruleRoi.height;

  if (boxes.length > 0) {
    let minBx = Number.POSITIVE_INFINITY;
    let minBy = Number.POSITIVE_INFINITY;
    let maxBx = Number.NEGATIVE_INFINITY;
    let maxBy = Number.NEGATIVE_INFINITY;

    for (const b of boxes) {
      minBx = Math.min(minBx, b.x);
      minBy = Math.min(minBy, b.y);
      maxBx = Math.max(maxBx, b.x + b.width);
      maxBy = Math.max(maxBy, b.y + b.height);
    }

    if (Number.isFinite(minBx) && Number.isFinite(minBy)) {
      envX = Math.max(0, Math.round(minBx - 8));
      envY = Math.max(0, Math.round(minBy - 8));
      envW = Math.round(maxBx - minBx + 16);
      envH = Math.round(maxBy - minBy + 16);
    }
  }

  // 1. Draw inner Pattern Region boundary envelope
  ctx.save();
  ctx.strokeStyle = isFail ? "#ef4444" : isPass ? "#10b981" : "#f43f5e";
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(envX, envY, envW, envH);
  ctx.setLineDash([]);

  const envBadge = `PATTERN REGION · [${envW}×${envH}]`;
  ctx.font = "bold 8px monospace";
  const envBw = ctx.measureText(envBadge).width + 8;
  ctx.fillStyle = "rgba(8, 12, 20, 0.85)";
  ctx.fillRect(envX, envY - 14, envBw, 14);
  ctx.strokeStyle = isFail ? "#ef4444" : isPass ? "#10b981" : "#f43f5e";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(envX, envY - 14, envBw, 14);
  ctx.fillStyle = isFail ? "#fca5a5" : isPass ? "#6ee7b7" : "#fda4af";
  ctx.fillText(envBadge, envX + 4, envY - 3);
  ctx.restore();

  // 2. Draw all individual character boxes with color-coded results
  for (const b of boxes) {
    const isMatched = matchedBoxesMap.has(b.number)
      ? Boolean(matchedBoxesMap.get(b.number))
      : isPass || status === undefined;

    if (isMatched) {
      ctx.strokeStyle = "#10b981";
      ctx.fillStyle = "rgba(16, 185, 129, 0.22)";
      ctx.lineWidth = 0.8;
      ctx.fillRect(b.x, b.y, b.width, b.height);
      ctx.strokeRect(b.x, b.y, b.width, b.height);

      if (b.label) {
        ctx.font = "bold 8px monospace";
        ctx.fillStyle = "#34d399";
        ctx.textAlign = "center";
        ctx.fillText(b.label, b.x + b.width / 2, b.y + b.height - 2.0);
      }
    } else {
      ctx.strokeStyle = "#ef4444";
      ctx.fillStyle = "rgba(239, 68, 68, 0.45)";
      ctx.lineWidth = 1.2;
      ctx.fillRect(b.x, b.y, b.width, b.height);
      ctx.strokeRect(b.x, b.y, b.width, b.height);

      // Red X mark
      ctx.beginPath();
      ctx.moveTo(b.x + 2, b.y + 2);
      ctx.lineTo(b.x + b.width - 2, b.y + b.height - 2);
      ctx.moveTo(b.x + b.width - 2, b.y + 2);
      ctx.lineTo(b.x + 2, b.y + b.height - 2);
      ctx.stroke();

      // Box number badge
      ctx.font = "bold 7px monospace";
      ctx.fillStyle = "#fecdd3";
      ctx.textAlign = "center";
      ctx.fillText(`#${b.number}`, b.x + b.width / 2, b.y - 1.5);
    }
  }

  ctx.restore();
}

function drawConstellationPattern(
  ctx: CanvasRenderingContext2D,
  roi: WorkpieceRoi,
  boxCount: number,
  status?: "pass" | "fail" | "warn" | "pending" | "skipped",
  imageWidth = 960,
  imageHeight = 540,
): void {
  const count = clampValue(boxCount, 4, 36);
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const cellW = (roi.width - 16) / cols;
  const cellH = (roi.height - 16) / rows;
  const synthBoxes: WhiteBoxMark[] = [];

  let drawn = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (drawn >= count) {
        break;
      }

      drawn += 1;
      const bx = Math.round(roi.x + 8 + c * cellW + 2);
      const by = Math.round(roi.y + 8 + r * cellH + 2);
      const bw = Math.max(12, Math.round(cellW - 6));
      const bh = Math.max(12, Math.round(cellH - 6));

      synthBoxes.push({
        number: drawn,
        x: bx,
        y: by,
        width: bw,
        height: bh,
        area: bw * bh,
      });
    }
  }

  drawCompletePatternOverlay(ctx, synthBoxes, new Set(), status, 8, imageWidth, imageHeight);
}

function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  bracketLen = 12,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  ctx.moveTo(x, y + bracketLen);
  ctx.lineTo(x, y);
  ctx.lineTo(x + bracketLen, y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + w - bracketLen, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + bracketLen);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + w, y + h - bracketLen);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w - bracketLen, y + h);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + bracketLen, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + h - bracketLen);
  ctx.stroke();
}

function drawPin1Reticle(
  ctx: CanvasRenderingContext2D,
  roi: WorkpieceRoi,
  status?: "pass" | "fail" | "warn" | "pending" | "skipped",
  score?: number,
  pin1Config?: Record<string, any>,
  ruleResult?: any,
  isAnalyzeMode = false,
): void {
  const isPass = status === "pass";
  const isFail = status === "fail";
  const ruleCenterX = Math.round(roi.x + roi.width / 2);
  const ruleCenterY = Math.round(roi.y + roi.height / 2);

  // 1. Derive nominal target coordinates relative to the rule ROI
  let nomX = ruleCenterX;
  let nomY = ruleCenterY;

  const regPin1Raw = pin1Config?.registeredPin1;
  const debugNomX = ruleResult?.debug?.nominalX;
  const debugNomY = ruleResult?.debug?.nominalY;

  const rawNomX =
    typeof pin1Config?.centerX === "number"
      ? pin1Config.centerX
      : typeof regPin1Raw?.centerX === "number"
        ? regPin1Raw.centerX
        : typeof regPin1Raw?.x === "number"
          ? regPin1Raw.x
          : undefined;
  const rawNomY =
    typeof pin1Config?.centerY === "number"
      ? pin1Config.centerY
      : typeof regPin1Raw?.centerY === "number"
        ? regPin1Raw.centerY
        : typeof regPin1Raw?.y === "number"
          ? regPin1Raw.y
          : undefined;

  if (typeof debugNomX === "number" && typeof debugNomY === "number") {
    nomX = debugNomX;
    nomY = debugNomY;
  } else if (typeof rawNomX === "number" && typeof rawNomY === "number") {
    nomX = rawNomX;
    nomY = rawNomY;
  } else if (
    typeof pin1Config?.relativeX === "number" &&
    typeof pin1Config?.relativeY === "number"
  ) {
    nomX = Math.round(roi.x + (pin1Config.relativeX / 100) * roi.width);
    nomY = Math.round(roi.y + (pin1Config.relativeY / 100) * roi.height);
  } else if (
    typeof regPin1Raw?.relativeX === "number" &&
    typeof regPin1Raw?.relativeY === "number"
  ) {
    nomX = Math.round(roi.x + (regPin1Raw.relativeX / 100) * roi.width);
    nomY = Math.round(roi.y + (regPin1Raw.relativeY / 100) * roi.height);
  }

  const debugHoleX = ruleResult?.debug?.detectedHoleX;
  const debugHoleY = ruleResult?.debug?.detectedHoleY;
  const hasPin1Found =
    ruleResult?.debug?.hasPin1Found ??
    (typeof debugHoleX === "number" && ruleResult?.debug?.status !== "missing" && !isFail);
  const isMissing =
    ruleResult?.debug?.status === "missing" ||
    (!hasPin1Found &&
      isFail &&
      (ruleResult?.debug?.holeCount === 0 ||
        Boolean(ruleResult?.message?.toLowerCase().includes("missing"))));

  const detX = typeof debugHoleX === "number" && !isMissing ? debugHoleX : nomX;
  const detY = typeof debugHoleY === "number" && !isMissing ? debugHoleY : nomY;
  const offsetPx =
    typeof ruleResult?.debug?.offsetPx === "number"
      ? ruleResult.debug.offsetPx
      : Math.hypot(detX - nomX, detY - nomY);
  const angleDeg =
    typeof ruleResult?.debug?.angleDeg === "number"
      ? ruleResult.debug.angleDeg
      : Math.round((Math.atan2(detY - nomY, detX - nomX) * 180) / Math.PI);

  ctx.save();

  // A. Nominal Pin 1 Target Reticle (Dashed cyan circle & crosshair matching Greyscale Simulation)
  ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
  ctx.lineWidth = 1.0;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.arc(nomX, nomY, 8.0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
  ctx.beginPath();
  ctx.moveTo(nomX - 5, nomY);
  ctx.lineTo(nomX + 5, nomY);
  ctx.moveTo(nomX, nomY - 5);
  ctx.lineTo(nomX, nomY + 5);
  ctx.stroke();

  // B. If Pin 1 Dimple Missing
  if (isMissing) {
    ctx.strokeStyle = "#f43f5e";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(nomX, nomY, 9.0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(nomX - 6, nomY - 6);
    ctx.lineTo(nomX + 6, nomY + 6);
    ctx.moveTo(nomX + 6, nomY - 6);
    ctx.lineTo(nomX - 6, nomY + 6);
    ctx.stroke();

    ctx.font = "bold 7.5px monospace";
    ctx.fillStyle = "#881337";
    ctx.fillRect(nomX - 44, nomY + 12, 88, 13);
    ctx.strokeStyle = "#f43f5e";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(nomX - 44, nomY + 12, 88, 13);

    ctx.fillStyle = "#fecdd3";
    ctx.textAlign = "center";
    ctx.fillText("MISSING PIN 1 DIMPLE", nomX, nomY + 21.5);
    ctx.restore();

    return;
  }

  // C. Detected Pin 1 Indentation (Solid green or red)
  const pin1Color = isPass ? "#10b981" : "#f43f5e";

  // Detected Hole Ring & Center Dot
  ctx.strokeStyle = pin1Color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(detX, detY, 7.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = pin1Color;
  ctx.beginPath();
  ctx.arc(detX, detY, 2.0, 0, Math.PI * 2);
  ctx.fill();

  // Reticle crosshairs
  ctx.beginPath();
  ctx.moveTo(detX - 10, detY);
  ctx.lineTo(detX + 10, detY);
  ctx.moveTo(detX, detY - 10);
  ctx.lineTo(detX, detY + 10);
  ctx.stroke();

  // Offset Vector (Line connecting Nominal to Detected)
  const distOffset = Math.hypot(detX - nomX, detY - nomY);

  if (distOffset > 1.5) {
    ctx.strokeStyle = isPass ? "rgba(16, 185, 129, 0.85)" : "rgba(244, 63, 94, 0.9)";
    ctx.lineWidth = 1.0;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(nomX, nomY);
    ctx.lineTo(detX, detY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Offset & Angle telemetry badge
  const sign = angleDeg >= 0 ? "+" : "";
  const tolStr =
    ruleResult?.debug?.tolerancePx !== undefined ? ` (±${ruleResult.debug.tolerancePx}px)` : "";
  const teleText = `Δ ${offsetPx.toFixed(1)}px | θ ${sign}${angleDeg.toFixed(1)}°${tolStr}`;
  ctx.font = "bold 7.5px monospace";
  const teleW = ctx.measureText(teleText).width + 8;
  const teleH = 13;

  ctx.fillStyle = isPass ? "#064e3b" : "#881337";
  ctx.fillRect(detX - teleW / 2, detY + 11, teleW, teleH);
  ctx.strokeStyle = pin1Color;
  ctx.lineWidth = 0.8;
  ctx.strokeRect(detX - teleW / 2, detY + 11, teleW, teleH);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(teleText, detX, detY + 20.5);

  ctx.restore();
}

function drawCaliperRuler(
  ctx: CanvasRenderingContext2D,
  roi: WorkpieceRoi,
  status?: "pass" | "fail" | "warn" | "pending" | "skipped",
): void {
  const color = status === "fail" ? "#ef4444" : status === "pass" ? "#10b981" : "#00e5ff";
  const midY = roi.y + roi.height / 2;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 2]);
  ctx.beginPath();
  ctx.moveTo(roi.x, midY);
  ctx.lineTo(roi.x + roi.width, midY);
  ctx.stroke();
  ctx.setLineDash([]);

  const ticks = 8;

  for (let i = 0; i <= ticks; i += 1) {
    const tx = roi.x + (i / ticks) * roi.width;
    ctx.beginPath();
    ctx.moveTo(tx, midY - 6);
    ctx.lineTo(tx, midY + 6);
    ctx.stroke();
  }
}

function drawDefectScanGrid(
  ctx: CanvasRenderingContext2D,
  roi: WorkpieceRoi,
  status?: "pass" | "fail" | "warn" | "pending" | "skipped",
): void {
  const color = status === "fail" ? "#ef4444" : status === "pass" ? "#10b981" : "#00e5ff";

  ctx.strokeStyle = status === "fail" ? "rgba(239, 68, 68, 0.35)" : "rgba(16, 185, 129, 0.30)";
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);

  const stepX = roi.width / 4;

  for (let i = 1; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(roi.x + i * stepX, roi.y);
    ctx.lineTo(roi.x + i * stepX, roi.y + roi.height);
    ctx.stroke();
  }

  const stepY = roi.height / 3;

  for (let j = 1; j < 3; j += 1) {
    ctx.beginPath();
    ctx.moveTo(roi.x, roi.y + j * stepY);
    ctx.lineTo(roi.x + roi.width, roi.y + j * stepY);
    ctx.stroke();
  }

  ctx.setLineDash([]);

  ctx.fillStyle = color;
  ctx.font = "bold 9px monospace";
  const label = status === "fail" ? "ANOMALY DETECTED" : "ZERO DEFECTS";
  ctx.fillText(label, roi.x + 6, roi.y + roi.height - 6);
}

function drawAreaGateRegion(
  ctx: CanvasRenderingContext2D,
  roi: WorkpieceRoi,
  status?: "pass" | "fail" | "warn" | "pending" | "skipped",
): void {
  const isFailed = status === "fail";
  const strokeColor = isFailed ? "rgba(239, 68, 68, 0.85)" : "rgba(16, 185, 129, 0.85)";
  const fillColor = isFailed ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)";
  const labelColor = isFailed ? "#ef4444" : "#10b981";

  ctx.save();
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = fillColor;
  ctx.lineWidth = 1.5;
  ctx.fillRect(roi.x, roi.y, roi.width, roi.height);
  ctx.strokeRect(roi.x, roi.y, roi.width, roi.height);

  ctx.fillStyle = labelColor;
  ctx.font = "bold 9px monospace";
  ctx.fillText("AREA GATE (T101)", roi.x + 6, roi.y + 14);
  ctx.restore();
}

function drawBlobInspectionRegion(
  ctx: CanvasRenderingContext2D,
  roi: WorkpieceRoi,
  status?: "pass" | "fail" | "warn" | "pending" | "skipped",
): void {
  const isFailed = status === "fail";
  const strokeColor = isFailed ? "rgba(239, 68, 68, 0.85)" : "rgba(139, 92, 246, 0.85)";
  const fillColor = isFailed ? "rgba(239, 68, 68, 0.15)" : "rgba(139, 92, 246, 0.15)";
  const labelColor = isFailed ? "#ef4444" : "#8b5cf6";

  ctx.save();
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = fillColor;
  ctx.lineWidth = 1.5;
  ctx.fillRect(roi.x, roi.y, roi.width, roi.height);
  ctx.strokeRect(roi.x, roi.y, roi.width, roi.height);

  ctx.fillStyle = labelColor;
  ctx.font = "bold 9px monospace";
  ctx.fillText("BLOB EXTRACTION (T109)", roi.x + 6, roi.y + 14);
  ctx.restore();
}

function drawScanningLaser(ctx: CanvasRenderingContext2D, roi: WorkpieceRoi): void {
  const midY = roi.y + roi.height / 2;

  const grad = ctx.createLinearGradient(roi.x, midY, roi.x + roi.width, midY);
  grad.addColorStop(0, "rgba(0, 229, 255, 0)");
  grad.addColorStop(0.5, "rgba(0, 229, 255, 0.85)");
  grad.addColorStop(1, "rgba(0, 229, 255, 0)");

  ctx.strokeStyle = grad;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(roi.x, midY);
  ctx.lineTo(roi.x + roi.width, midY);
  ctx.stroke();
}

function drawFrameInspectionHud(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  totalRules: number,
  passCount: number,
  failCount: number,
  isAnalyzing: boolean,
): void {
  // If not analyzing and no results to display, do not draw HUD box to maximize workpiece viewing area
  if (!isAnalyzing && passCount === 0 && failCount === 0) {
    return;
  }

  const hudW = 280;
  const hudH = 34;
  const hudX = canvasWidth - hudW - 12;
  const hudY = 12;

  ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
  ctx.fillRect(hudX, hudY, hudW, hudH);

  const isAllPass = passCount === totalRules && totalRules > 0;
  const borderColor = isAnalyzing
    ? "#00e5ff"
    : isAllPass
      ? "#10b981"
      : failCount > 0
        ? "#ef4444"
        : "#64748b";

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(hudX, hudY, hudW, hudH);

  ctx.fillStyle = borderColor;
  ctx.fillRect(hudX, hudY, 4, hudH);

  ctx.font = "bold 11px monospace";

  if (isAnalyzing) {
    ctx.fillStyle = "#00e5ff";
    ctx.fillText("● OPTICAL INSPECTION RUNNING", hudX + 12, hudY + 15);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px sans-serif";
    ctx.fillText(`Inspecting ${totalRules} rules sequentially...`, hudX + 12, hudY + 28);
  } else if (isAllPass) {
    ctx.fillStyle = "#10b981";
    ctx.fillText(`✔ FRAME RESULTS: 100% PASS (${passCount}/${totalRules})`, hudX + 12, hudY + 15);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px sans-serif";
    ctx.fillText("All inspection criteria satisfied. Zero defects.", hudX + 12, hudY + 28);
  } else if (failCount > 0) {
    ctx.fillStyle = "#ef4444";
    ctx.fillText(`✖ FRAME RESULTS: FAIL (${failCount} REJECTED)`, hudX + 12, hudY + 15);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px sans-serif";
    ctx.fillText(
      `${passCount}/${totalRules} rules passed inspection limits.`,
      hudX + 12,
      hudY + 28,
    );
  } else {
    ctx.fillStyle = "#38bdf8";
    ctx.fillText(`FRAME READY (${totalRules} RULES)`, hudX + 12, hudY + 15);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px sans-serif";
    ctx.fillText("Optical acquisition calibrated. Ready to inspect.", hudX + 12, hudY + 28);
  }
}

function drawPocketOverlay(ctx: CanvasRenderingContext2D, pocket: PocketEvaluationResult): void {
  const { x, y, width: w, height: h } = pocket.region;

  if (pocket.isEmpty) {
    ctx.strokeStyle = "rgba(245, 158, 11, 0.75)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(245, 158, 11, 0.08)";
    ctx.fillRect(x, y, w, h);

    const badgeW = 150;
    const badgeH = 20;
    const badgeX = x + Math.max(4, Math.round((w - badgeW) / 2));
    const badgeY = y + Math.max(4, Math.round((h - badgeH) / 2));

    ctx.fillStyle = "rgba(30, 27, 24, 0.94)";
    ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1;
    ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 9.5px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`⊘ POCKET #${pocket.pocketIndex}: EMPTY CAVITY`, badgeX + badgeW / 2, badgeY + 14);
    ctx.textAlign = "left";

    return;
  }

  const isPass = pocket.status === "pass";
  const borderColor = isPass ? "#10b981" : "#ef4444";

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  const badgeText = isPass ? `POCKET #${pocket.pocketIndex} ✔` : `POCKET #${pocket.pocketIndex} ✖`;
  ctx.font = "bold 9px monospace";
  const tw = ctx.measureText(badgeText).width;
  const badgeW = tw + 10;
  const badgeH = 16;

  ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
  ctx.fillRect(x + 2, y + 2, badgeW, badgeH);
  ctx.fillStyle = isPass ? "#10b981" : "#ef4444";
  ctx.fillText(badgeText, x + 6, y + 13);

  // Per-gap distances: a small dimension mark on each inter-pin gap, labeled in mm.
  if (pocket.pinPitch && pocket.pinPitch.gaps.length > 0) {
    const gaps = pocket.pinPitch.gaps;

    ctx.font = "bold 7px monospace";
    ctx.textAlign = "center";

    gaps.forEach((gap, gapIndex) => {
      const gx1 = x + gap.x1;
      const gy1 = y + gap.y1;
      const gx2 = x + gap.x2;
      const gy2 = y + gap.y2;

      ctx.strokeStyle = "rgba(34, 211, 238, 0.95)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx1, gy1);
      ctx.lineTo(gx2, gy2);
      ctx.stroke();

      const label = `${gap.gapMm.toFixed(2)}mm`;
      const labelW = ctx.measureText(label).width + 6;
      const midX = (gx1 + gx2) / 2;
      const midY = (gy1 + gy2) / 2;
      // Alternate above / below the gap line so dense pins don't collide.
      const labelY = gapIndex % 2 === 0 ? midY + 2 : midY - 13;

      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      ctx.fillRect(midX - labelW / 2, labelY, labelW, 11);
      ctx.fillStyle = "#22d3ee";
      ctx.fillText(label, midX, labelY + 8.5);
    });

    ctx.textAlign = "left";
  }

  // Chip width: dimension line below the device, width in mm underneath it.
  if (pocket.deviceMeasurement) {
    const dm = pocket.deviceMeasurement;
    const dimX1 = x + dm.leftEdgePx;
    const dimX2 = x + dm.rightEdgePx;
    const dimY = y + dm.bottomEdgePx + 12;

    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dimX1, dimY);
    ctx.lineTo(dimX2, dimY);
    ctx.stroke();

    const arrowLen = 5;

    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.moveTo(dimX1, dimY);
    ctx.lineTo(dimX1 + arrowLen, dimY - 2.5);
    ctx.lineTo(dimX1 + arrowLen, dimY + 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(dimX2, dimY);
    ctx.lineTo(dimX2 - arrowLen, dimY - 2.5);
    ctx.lineTo(dimX2 - arrowLen, dimY + 2.5);
    ctx.closePath();
    ctx.fill();

    const widthLabel = `${dm.widthMm.toFixed(2)}mm`;

    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";

    const labelW = ctx.measureText(widthLabel).width + 8;
    const labelX = (dimX1 + dimX2) / 2;

    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(labelX - labelW / 2, dimY + 3, labelW, 12);
    ctx.fillStyle = "#facc15";
    ctx.fillText(widthLabel, labelX, dimY + 12);
    ctx.textAlign = "left";
  }
}

function drawCornerHandles(
  ctx: CanvasRenderingContext2D,
  roi: WorkpieceRoi,
  color = "#00e5ff",
): void {
  const size = 8;
  const half = size / 2;
  const corners = [
    { x: roi.x, y: roi.y },
    { x: roi.x + roi.width, y: roi.y },
    { x: roi.x, y: roi.y + roi.height },
    { x: roi.x + roi.width, y: roi.y + roi.height },
  ];

  ctx.fillStyle = "#0a0e17";
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  for (const c of corners) {
    ctx.fillRect(c.x - half, c.y - half, size, size);
    ctx.strokeRect(c.x - half, c.y - half, size, size);
  }
}

export function VisualToolWorkpieceCanvas({
  imageRef,
  roi: propRoi,
  onChangeRoi,
  toolCode,
  toolName,
  toolParams,
  isEditable = true,
  isAnalyzeMode = false,
  overlayRules = [],
  selectedRuleId,
  onSelectRule,
  onLaunchPatternTuner,
  onPatternBoxesChange,
  actionSlot,
  validationStatus,
  validationScore,
  validationResultsMap,
  onRunAnalysis,
  isAnalyzing = false,
  tapeStripResult = null,
  onUpdateParams,
}: VisualToolWorkpieceCanvasProps): React.JSX.Element {
  const roi = useMemo(() => propRoi ?? { x: 0, y: 0, width: 960, height: 540 }, [propRoi]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [detectedBoxes, setDetectedBoxes] = useState<WhiteBoxMark[]>([]);
  const [excludedNumbers, setExcludedNumbers] = useState<Set<number>>(new Set());
  const [autoDetectedBoxesByRuleId, setAutoDetectedBoxesByRuleId] = useState<
    Record<string, WhiteBoxMark[]>
  >({});
  const [activeCornerHandle, setActiveCornerHandle] = useState<"nw" | "ne" | "sw" | "se" | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number; initialRoi: WorkpieceRoi } | null>(null);
  const [cursorHandleType, setCursorHandleType] = useState<"nw" | "ne" | "sw" | "se" | null>(null);
  const [isMovingRoi, setIsMovingRoi] = useState(false);
  const [isDraggingPin1, setIsDraggingPin1] = useState(false);
  const [isHoveringRoi, setIsHoveringRoi] = useState(false);

  const imageMetrics = useMemo(() => {
    const w = 960;
    const h = 540;

    if (!imageElement) {
      return {
        fit: { x: 0, y: 0, width: w, height: h },
        sourceScaleX: 1,
        sourceScaleY: 1,
      };
    }

    const naturalW = imageElement.naturalWidth || imageElement.width || w;
    const naturalH = imageElement.naturalHeight || imageElement.height || h;
    const fit = getContainedDimensions(naturalW, naturalH, w, h);
    const sourceScaleX = fit.width / naturalW;
    const sourceScaleY = fit.height / naturalH;

    return { fit, sourceScaleX, sourceScaleY };
  }, [imageElement]);

  const imgSrc = imageRef || null;

  useEffect(() => {
    let isMounted = true;

    if (!imgSrc) {
      setImageElement(null);

      return () => {
        isMounted = false;
      };
    }

    const isForeignUrl =
      (imgSrc.startsWith("http://") || imgSrc.startsWith("https://")) &&
      typeof window !== "undefined" &&
      imgSrc.startsWith(window.location.origin) === false;

    const img = new Image();

    if (isForeignUrl) {
      img.crossOrigin = "anonymous";
    }

    const cacheLoadedPixels = (loadedImg: HTMLImageElement) => {
      try {
        const naturalW = loadedImg.naturalWidth || loadedImg.width || 960;
        const naturalH = loadedImg.naturalHeight || loadedImg.height || 540;
        const isSinglePocket = naturalW / naturalH < 0.92;
        const targetW = isSinglePocket ? 960 : naturalW;
        const targetH = isSinglePocket ? 540 : naturalH;
        const offCanvas = document.createElement("canvas");
        offCanvas.width = targetW;
        offCanvas.height = targetH;
        const offCtx = offCanvas.getContext("2d", { willReadFrequently: true });

        if (offCtx) {
          offCtx.drawImage(loadedImg, 0, 0, targetW, targetH);
          const imgData = offCtx.getImageData(0, 0, targetW, targetH);

          registerWorkpieceImageCache(imgSrc, {
            width: targetW,
            height: targetH,
            rgba: imgData.data,
          });
        }
      } catch {
        // Ignored
      }
    };

    img.onload = () => {
      if (isMounted) {
        setImageElement(img);
        cacheLoadedPixels(img);
      }
    };

    img.onerror = () => {
      if (img.crossOrigin) {
        const retry = new Image();

        retry.onload = () => {
          if (isMounted) {
            setImageElement(retry);
            cacheLoadedPixels(retry);
          }
        };

        retry.onerror = () => {
          if (isMounted) {
            // Fallback pattern canvas so workpiece canvas is always interactive
            const fallbackCanvas = document.createElement("canvas");
            fallbackCanvas.width = 960;
            fallbackCanvas.height = 540;
            const fCtx = fallbackCanvas.getContext("2d");

            if (fCtx) {
              fCtx.fillStyle = "#0f172a";
              fCtx.fillRect(0, 0, 960, 540);
              fCtx.strokeStyle = "#1e293b";
              fCtx.lineWidth = 1;

              for (let x = 0; x < 960; x += 40) {
                fCtx.beginPath();
                fCtx.moveTo(x, 0);
                fCtx.lineTo(x, 540);
                fCtx.stroke();
              }

              for (let y = 0; y < 540; y += 40) {
                fCtx.beginPath();
                fCtx.moveTo(0, y);
                fCtx.lineTo(960, y);
                fCtx.stroke();
              }
            }

            const fallbackImg = new Image();
            fallbackImg.src = fallbackCanvas.toDataURL();

            fallbackImg.onload = () => {
              if (isMounted) {
                setImageElement(fallbackImg);
              }
            };
          }
        };

        retry.src = imgSrc;

        return;
      }

      if (isMounted) {
        // Fallback pattern canvas so workpiece canvas is always interactive
        const fallbackCanvas = document.createElement("canvas");
        fallbackCanvas.width = 960;
        fallbackCanvas.height = 540;
        const fCtx = fallbackCanvas.getContext("2d");

        if (fCtx) {
          fCtx.fillStyle = "#0f172a";
          fCtx.fillRect(0, 0, 960, 540);
          fCtx.strokeStyle = "#1e293b";
          fCtx.lineWidth = 1;

          for (let x = 0; x < 960; x += 40) {
            fCtx.beginPath();
            fCtx.moveTo(x, 0);
            fCtx.lineTo(x, 540);
            fCtx.stroke();
          }

          for (let y = 0; y < 540; y += 40) {
            fCtx.beginPath();
            fCtx.moveTo(0, y);
            fCtx.lineTo(960, y);
            fCtx.stroke();
          }
        }

        const fallbackImg = new Image();
        fallbackImg.src = fallbackCanvas.toDataURL();

        fallbackImg.onload = () => {
          if (isMounted) {
            setImageElement(fallbackImg);
          }
        };
      }
    };

    img.src = imgSrc;

    if (img.complete && img.naturalWidth > 0) {
      setImageElement(img);
      cacheLoadedPixels(img);
    }

    return () => {
      isMounted = false;
    };
  }, [imgSrc]);

  const rawThreshold = toolParams?.greyscaleLevel ?? toolParams?.threshold ?? 170;
  const thresholdLuma = typeof rawThreshold === "number" ? rawThreshold : 170;
  const parsedToolBoxes = useMemo(() => parseBoxesFromParams(toolParams, roi), [toolParams, roi]);
  const activeBoxCount =
    typeof toolParams?.activeBoxCount === "number"
      ? toolParams.activeBoxCount
      : parsedToolBoxes.length;

  const isPatternMatching =
    Boolean(toolName?.toLowerCase().includes("pattern")) ||
    Boolean(toolName?.toLowerCase().includes("white box")) ||
    toolCode === "T102" ||
    toolCode === "T116" ||
    toolCode === "greyscale_pattern_match";

  const isPin1 =
    Boolean(toolName?.toLowerCase().includes("pin 1")) ||
    Boolean(toolName?.toLowerCase().includes("pin1")) ||
    toolCode === "T105" ||
    toolCode === "T117" ||
    toolCode === "pin1_config" ||
    toolCode === "pin1_orientation";

  const isCaliper =
    Boolean(toolName?.toLowerCase().includes("caliper")) ||
    Boolean(toolName?.toLowerCase().includes("pitch")) ||
    toolCode === "T110";

  const configuredBoxes = useMemo<WhiteBoxMark[]>(() => {
    if (parsedToolBoxes.length > 0) {
      return parsedToolBoxes;
    }

    return [];
  }, [parsedToolBoxes]);

  const activeBoxesToDraw = configuredBoxes.length > 0 ? configuredBoxes : detectedBoxes;

  const handleDetectElements = useCallback(
    (shouldNotify = false) => {
      if (!imageElement) {
        return;
      }

      const naturalW = imageElement.naturalWidth || imageElement.width || 960;
      const naturalH = imageElement.naturalHeight || imageElement.height || 540;
      const isSinglePocket = naturalW / naturalH < 0.92;
      const targetW = isSinglePocket ? 960 : naturalW;
      const targetH = isSinglePocket ? 540 : naturalH;
      const offscreen = document.createElement("canvas");
      offscreen.width = targetW;
      offscreen.height = targetH;
      const offCtx = offscreen.getContext("2d");

      if (!offCtx) {
        return;
      }

      offCtx.drawImage(imageElement, 0, 0, targetW, targetH);
      const imgData = offCtx.getImageData(0, 0, targetW, targetH);

      const result = markWhiteBoxes({
        width: targetW,
        height: targetH,
        rgba: imgData.data,
        whiteThreshold: thresholdLuma,
        searchRegion: roi,
      });

      const finalBoxes = result.boxes;

      setDetectedBoxes(finalBoxes);
      setExcludedNumbers(new Set());

      if (shouldNotify && onPatternBoxesChange) {
        const constellation = finalBoxes.map((b) => ({
          boxNumber: b.number,
          x: b.x,
          y: b.y,
          relX: b.x - roi.x,
          relY: b.y - roi.y,
          width: b.width,
          height: b.height,
          area: b.area,
        }));
        onPatternBoxesChange(finalBoxes, constellation);
      }
    },
    [imageElement, thresholdLuma, roi, onPatternBoxesChange],
  );

  useEffect(() => {
    if (imageElement && isPatternMatching && configuredBoxes.length === 0) {
      handleDetectElements(false);
    }
  }, [imageElement, isPatternMatching, configuredBoxes.length, handleDetectElements]);

  useEffect(() => {
    if (!imageElement || overlayRules.length === 0) {
      return;
    }

    const rulesNeedingDetection = overlayRules.filter((r) => {
      const code = String(r.params?.toolCode || "");
      const name = (r.name || "").toLowerCase();
      const isPattern =
        code === "T102" ||
        code === "T116" ||
        name.includes("pattern") ||
        name.includes("white box");

      if (!isPattern) {
        return false;
      }

      const parsed = parseBoxesFromParams(r.params);

      return parsed.length === 0 && !autoDetectedBoxesByRuleId[r.id];
    });

    if (rulesNeedingDetection.length === 0) {
      return;
    }

    const naturalW = imageElement.naturalWidth || imageElement.width || 960;
    const naturalH = imageElement.naturalHeight || imageElement.height || 540;
    const isSinglePocket = naturalW / naturalH < 0.92;
    const targetW = isSinglePocket ? 960 : naturalW;
    const targetH = isSinglePocket ? 540 : naturalH;
    const offscreen = document.createElement("canvas");
    offscreen.width = targetW;
    offscreen.height = targetH;
    const offCtx = offscreen.getContext("2d");

    if (!offCtx) {
      return;
    }

    offCtx.drawImage(imageElement, 0, 0, targetW, targetH);
    const imgData = offCtx.getImageData(0, 0, targetW, targetH);
    const updates: Record<string, WhiteBoxMark[]> = {};

    for (const r of rulesNeedingDetection) {
      const thresh = Number(r.params?.threshold ?? r.params?.greyscaleLevel ?? 170);
      const ruleRegion: WorkpieceRoi = {
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
      };

      const res = markWhiteBoxes({
        width: targetW,
        height: targetH,
        rgba: imgData.data,
        whiteThreshold: thresh,
        searchRegion: ruleRegion,
      });

      const finalBoxes = res.boxes;

      updates[r.id] = finalBoxes;
    }

    setAutoDetectedBoxesByRuleId((prev) => ({
      ...prev,
      ...updates,
    }));
  }, [imageElement, overlayRules, autoDetectedBoxesByRuleId]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    const w = 960;
    const h = 540;

    if (canvas.width !== w) {
      canvas.width = w;
    }

    if (canvas.height !== h) {
      canvas.height = h;
    }

    if (!imageElement) {
      drawNoImagePlaceholder(ctx, w, h);

      return;
    }

    // Always render natural camera/workpiece image centered with aspect ratio preserved
    const naturalW = imageElement.naturalWidth || imageElement.width || w;
    const naturalH = imageElement.naturalHeight || imageElement.height || h;
    const fit = getContainedDimensions(naturalW, naturalH, w, h);
    const sourceScaleX = fit.width / naturalW;
    const sourceScaleY = fit.height / naturalH;

    ctx.fillStyle = "#06080d";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(imageElement, fit.x, fit.y, fit.width, fit.height);

    const rulesToRender = overlayRules.length > 0 ? overlayRules : [];
    const activeDisplayRoi = roi;

    // Analyze mode keeps the image clean until the user clicks Analyze,
    // unless a rule is currently selected or editable for inspection/tuning:
    if (
      isAnalyzeMode &&
      !tapeStripResult &&
      rulesToRender.length > 0 &&
      !selectedRuleId &&
      !isEditable
    ) {
      return;
    }

    if (rulesToRender.length === 0) {
      if (tapeStripResult && tapeStripResult.totalPockets > 1) {
        ctx.save();
        ctx.translate(fit.x, fit.y);
        ctx.scale(sourceScaleX, sourceScaleY);

        for (const pocket of tapeStripResult.pockets) {
          drawPocketOverlay(ctx, pocket);
        }

        ctx.restore();
      }

      if (isAnalyzeMode) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(w / 2 - 220, h / 2 - 25, 440, 50);
        ctx.strokeStyle = "rgba(100, 116, 139, 0.5)";
        ctx.strokeRect(w / 2 - 220, h / 2 - 25, 440, 50);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          "No rules defined. Click 'Add rule from tools' to start inspection.",
          w / 2,
          h / 2 + 5,
        );
        ctx.textAlign = "left";

        return;
      }

      const isFailed = validationStatus === "fail";
      const isWarn = validationStatus === "warn";
      const isPass = validationStatus === "pass";

      const roiStroke = isFailed ? "#ef4444" : isWarn ? "#f59e0b" : isPass ? "#10b981" : "#00e5ff";
      const roiFill = isFailed
        ? "rgba(239, 68, 68, 0.16)"
        : isWarn
          ? "rgba(245, 158, 11, 0.14)"
          : isPass
            ? "rgba(16, 185, 129, 0.14)"
            : "rgba(0, 229, 255, 0.12)";

      // Search region (ROI) bounding outline and corner-only handles
      const shapeType = String((toolParams as any)?.shapeType || "rectangle").toLowerCase();

      ctx.save();
      ctx.strokeStyle = roiStroke;
      ctx.lineWidth = 1.5;
      ctx.fillStyle = roiFill;

      if (shapeType === "circle") {
        ctx.beginPath();
        ctx.ellipse(
          roi.x + roi.width / 2,
          roi.y + roi.height / 2,
          Math.max(2, roi.width / 2),
          Math.max(2, roi.height / 2),
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(roi.x, roi.y, roi.width, roi.height);
        ctx.strokeRect(roi.x, roi.y, roi.width, roi.height);
      }

      if (isEditable) {
        drawCornerHandles(ctx, roi, roiStroke);
      }

      ctx.restore();

      if (isPatternMatching) {
        const effectiveRegion = roi;
        const ruleBoxesFromParams = parseBoxesFromParams(toolParams, effectiveRegion);
        const boxesToDraw =
          activeBoxesToDraw.length > 0
            ? activeBoxesToDraw
            : ruleBoxesFromParams.length > 0
              ? ruleBoxesFromParams
              : [];

        drawGreyscaleSimulationPatternOverlay(
          ctx,
          effectiveRegion,
          boxesToDraw,
          validationStatus,
          validationScore,
          undefined,
          isAnalyzeMode,
          false,
        );
      } else if (isPin1) {
        drawPin1Reticle(
          ctx,
          roi,
          validationStatus,
          validationScore,
          (toolParams as any)?.pin1Config,
          undefined,
          isAnalyzeMode,
        );
      } else if (isCaliper) {
        drawCaliperRuler(ctx, roi, validationStatus);
      }

      if (
        isAnalyzeMode ||
        validationStatus ||
        (validationResultsMap && Object.keys(validationResultsMap).length > 0)
      ) {
        drawFrameInspectionHud(ctx, w, 1, isPass ? 1 : 0, isFailed ? 1 : 0, Boolean(isAnalyzing));
      }
    } else {
      let totalPassCount = 0;
      let totalFailCount = 0;

      ctx.save();
      ctx.translate(fit.x, fit.y);
      ctx.scale(sourceScaleX, sourceScaleY);

      if (tapeStripResult && tapeStripResult.totalPockets > 1) {
        for (const pocket of tapeStripResult.pockets) {
          drawPocketOverlay(ctx, pocket);
        }
      }

      for (let idx = 0; idx < rulesToRender.length; idx += 1) {
        const rule = rulesToRender[idx];

        if (rule.isHidden) {
          continue;
        }

        const isSelected = rule.id === selectedRuleId;
        const ruleResult = validationResultsMap?.[rule.id];
        const occupiedTapePockets =
          tapeStripResult && tapeStripResult.totalPockets > 1
            ? tapeStripResult.pockets.filter((p) => !p.isEmpty)
            : [];
        const tapePocketResults = occupiedTapePockets
          .map((p) => p.ruleResults[rule.id])
          .filter(Boolean);
        const hasTapeFail = tapePocketResults.some((res) => res.status === "fail");
        const tapeRuleStatus =
          tapePocketResults.length > 0 ? (hasTapeFail ? "fail" : "pass") : undefined;
        const tapeRuleScore =
          tapePocketResults.length > 0
            ? tapePocketResults.reduce((acc, curr) => acc + (curr.score ?? 0), 0) /
              tapePocketResults.length
            : undefined;

        const effectiveStatus =
          ruleResult?.status ?? tapeRuleStatus ?? (isSelected ? validationStatus : undefined);
        const effectiveScore =
          ruleResult?.score ?? tapeRuleScore ?? (isSelected ? validationScore : undefined);

        if (isAnalyzeMode && !effectiveStatus && !isSelected && occupiedTapePockets.length === 0) {
          continue;
        }

        if (effectiveStatus === "pass") {
          totalPassCount += 1;
        }

        if (effectiveStatus === "fail") {
          totalFailCount += 1;
        }

        const isFailed = effectiveStatus === "fail";
        const isWarn = effectiveStatus === "warn";
        const isPass = effectiveStatus === "pass";

        const strokeColor = isFailed
          ? "#ef4444"
          : isWarn
            ? "#f59e0b"
            : isPass
              ? "#10b981"
              : isSelected
                ? "#00e5ff"
                : "rgba(100, 116, 139, 0.75)";

        const fillColor = isFailed
          ? "rgba(239, 68, 68, 0.16)"
          : isWarn
            ? "rgba(245, 158, 11, 0.14)"
            : isPass
              ? "rgba(16, 185, 129, 0.14)"
              : isSelected
                ? "rgba(0, 229, 255, 0.12)"
                : "rgba(100, 116, 139, 0.06)";

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isSelected ? 2.5 : 1.5;

        const ruleX = isSelected && isEditable ? activeDisplayRoi.x : rule.x;
        const ruleY = isSelected && isEditable ? activeDisplayRoi.y : rule.y;
        const ruleW = isSelected && isEditable ? activeDisplayRoi.width : rule.width;
        const ruleH = isSelected && isEditable ? activeDisplayRoi.height : rule.height;
        const ruleRoi: WorkpieceRoi = { x: ruleX, y: ruleY, width: ruleW, height: ruleH };

        const effectiveToolCode = String(
          rule.params?.toolCode || (isSelected && toolCode ? toolCode : ""),
        );

        const ruleNameLower = (rule.name || "").toLowerCase();
        const isRulePattern =
          effectiveToolCode === "T102" ||
          effectiveToolCode === "T116" ||
          ruleNameLower.includes("pattern") ||
          ruleNameLower.includes("white box") ||
          (isSelected && isPatternMatching);

        const isRulePin1 =
          effectiveToolCode === "T105" ||
          effectiveToolCode === "T117" ||
          ruleNameLower.includes("pin1") ||
          ruleNameLower.includes("pin 1") ||
          (isSelected && isPin1);

        const isRuleCaliper =
          effectiveToolCode === "T110" ||
          ruleNameLower.includes("caliper") ||
          ruleNameLower.includes("pitch") ||
          (isSelected && isCaliper);

        // Render Search Region (ROI) bounding box for the active / selected rule
        if (isSelected) {
          const shapeType = String(
            (rule.params as any)?.shapeType || (toolParams as any)?.shapeType || "rectangle",
          ).toLowerCase();

          ctx.save();
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 2.0;
          ctx.setLineDash([6, 4]);

          if (shapeType === "circle") {
            const rad = Math.min(ruleRoi.width, ruleRoi.height) / 2;

            ctx.beginPath();
            ctx.arc(
              ruleRoi.x + ruleRoi.width / 2,
              ruleRoi.y + ruleRoi.height / 2,
              rad,
              0,
              Math.PI * 2,
            );
            ctx.stroke();
            ctx.fillStyle = fillColor;
            ctx.fill();
          } else {
            ctx.strokeRect(ruleRoi.x, ruleRoi.y, ruleRoi.width, ruleRoi.height);
            ctx.fillStyle = fillColor;
            ctx.fillRect(ruleRoi.x, ruleRoi.y, ruleRoi.width, ruleRoi.height);
          }

          ctx.setLineDash([]);

          // Search Region label badge
          const labelPrefix = isRulePin1
            ? "PIN 1 SEARCH REGION"
            : isRulePattern
              ? "PATTERN SEARCH REGION"
              : `${rule.name.toUpperCase()} SEARCH REGION`;
          const badgeText = `${labelPrefix} · [${Math.round(ruleRoi.width)}×${Math.round(ruleRoi.height)}]`;
          ctx.font = "bold 9px monospace";
          const tw = ctx.measureText(badgeText).width;
          const badgeW = tw + 10;
          const badgeH = 16;
          const badgeY = Math.max(16, ruleRoi.y - 18);

          ctx.fillStyle = "rgba(8, 12, 20, 0.9)";
          ctx.fillRect(ruleRoi.x, badgeY, badgeW, badgeH);
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(ruleRoi.x, badgeY, badgeW, badgeH);

          ctx.fillStyle = strokeColor;
          ctx.fillText(badgeText, ruleRoi.x + 5, badgeY + 11.5);

          // 4 Corner drag handles
          if (isEditable) {
            drawCornerHandles(ctx, ruleRoi, strokeColor);
          }

          ctx.restore();
        }

        let badgeX = ruleX;
        let badgeY = ruleY;

        if (isRulePin1) {
          const pinCfg = (rule.params as any)?.pin1Config;
          const ruleDebug = (ruleResult as any)?.debug;
          const firstPocketRes = occupiedTapePockets[0]?.ruleResults[rule.id];
          const firstHoleX =
            firstPocketRes?.debug?.detectedHoleX ?? firstPocketRes?.debug?.nominalX;
          const firstHoleY =
            firstPocketRes?.debug?.detectedHoleY ?? firstPocketRes?.debug?.nominalY;

          const multiDevicePin1 = Array.isArray(ruleDebug?.multiDevicePin1)
            ? ruleDebug.multiDevicePin1
            : Array.isArray((rule.params as any)?.multiDevicePin1)
              ? (rule.params as any).multiDevicePin1
              : [];
          const firstMarker = multiDevicePin1[0];
          const markerHoleX = firstMarker?.x ?? firstMarker?.centerX;
          const markerHoleY = firstMarker?.y ?? firstMarker?.centerY;
          const debugHoleX =
            firstHoleX ?? markerHoleX ?? ruleDebug?.detectedHoleX ?? ruleDebug?.nominalX;
          const debugHoleY =
            firstHoleY ?? markerHoleY ?? ruleDebug?.detectedHoleY ?? ruleDebug?.nominalY;
          const hX =
            debugHoleX ??
            pinCfg?.centerX ??
            pinCfg?.registeredPin1?.centerX ??
            pinCfg?.registeredPin1?.x;
          const hY =
            debugHoleY ??
            pinCfg?.centerY ??
            pinCfg?.registeredPin1?.centerY ??
            pinCfg?.registeredPin1?.y;

          if (typeof hX === "number" && typeof hY === "number") {
            badgeX = Math.max(10, Math.round(hX - 60));
            badgeY = Math.max(25, Math.round(hY - 20));
          }
        }

        const isRuleArea =
          effectiveToolCode === "T101" ||
          ruleNameLower.includes("area") ||
          ruleNameLower.includes("pixel intensity");

        const isRuleBlob =
          effectiveToolCode === "T109" ||
          ruleNameLower.includes("blob") ||
          ruleNameLower.includes("bridge");

        const isRuleDefect =
          effectiveToolCode === "T107" ||
          effectiveToolCode === "T108" ||
          effectiveToolCode === "T118" ||
          ruleNameLower.includes("defect") ||
          ruleNameLower.includes("scratch") ||
          ruleNameLower.includes("crack") ||
          ruleNameLower.includes("void") ||
          ruleNameLower.includes("porosity") ||
          ruleNameLower.includes("flaw");

        if (isRulePattern) {
          if (occupiedTapePockets.length > 0) {
            const multiDevicePassRegions = occupiedTapePockets.map((p) => ({
              label: `Pocket #${p.pocketIndex}`,
              region: p.region,
            }));

            for (const pocket of occupiedTapePockets) {
              const pRes = pocket.ruleResults[rule.id];
              const pStatus = pRes?.status ?? effectiveStatus;
              const pScore = pRes?.score ?? effectiveScore;
              const pBoxResults = (pRes as any)?.debug?.boxResults;
              const pBoxes =
                Array.isArray(pBoxResults) && pBoxResults.length > 0
                  ? pBoxResults.map((br: any) => ({
                      number: br.boxNumber,
                      label: br.label,
                      x: br.matchedX ?? br.referenceX,
                      y: br.matchedY ?? br.referenceY,
                      width: br.width,
                      height: br.height,
                      area: br.width * br.height,
                    }))
                  : parseBoxesFromParams((pRes as any)?.params ?? rule.params, pocket.region);

              const characterBoxesFallback =
                pBoxes.length === 0 && Array.isArray((pocket as any).characterBoxes)
                  ? ((pocket as any).characterBoxes as any[]).map((b: any) => ({
                      number: b.number ?? b.boxNumber,
                      label: b.label ?? b.character,
                      x: b.x ?? b.referenceX,
                      y: b.y ?? b.referenceY,
                      width: b.width,
                      height: b.height,
                      area: b.width * b.height,
                    }))
                  : [];

              const finalBoxes = pBoxes.length > 0 ? pBoxes : characterBoxesFallback;

              drawGreyscaleSimulationPatternOverlay(
                ctx,
                pocket.region,
                finalBoxes,
                pStatus as "pass" | "fail" | "warn" | "pending" | "skipped",
                pScore,
                pBoxResults,
                isAnalyzeMode,
                false,
              );
            }
          } else {
            const effectiveRegion: WorkpieceRoi = {
              x: ruleX,
              y: ruleY,
              width: ruleW,
              height: ruleH,
            };
            const ruleBoxesFromParams = parseBoxesFromParams(rule.params, effectiveRegion);
            const boxResults = (ruleResult as any)?.debug?.boxResults;
            const isSkipped = Boolean((ruleResult as any)?.debug?.isSkipped);
            const multiDevicePassRegions = Array.isArray(
              (ruleResult as any)?.debug?.multiDevicePassRegions,
            )
              ? (ruleResult as any).debug.multiDevicePassRegions
              : Array.isArray((rule.params as any)?.multiDevicePassRegions)
                ? (rule.params as any).multiDevicePassRegions
                : [];
            const ruleBoxes =
              Array.isArray(boxResults) && boxResults.length > 0
                ? boxResults.map((br: any) => ({
                    number: br.boxNumber,
                    label: br.label,
                    x: br.matchedX ?? br.referenceX,
                    y: br.matchedY ?? br.referenceY,
                    width: br.width,
                    height: br.height,
                    area: br.width * br.height,
                  }))
                : ruleBoxesFromParams.length > 0
                  ? ruleBoxesFromParams
                  : isSelected && activeBoxesToDraw.length > 0
                    ? activeBoxesToDraw
                    : [];

            drawGreyscaleSimulationPatternOverlay(
              ctx,
              effectiveRegion,
              ruleBoxes,
              effectiveStatus,
              effectiveScore,
              boxResults,
              isAnalyzeMode,
              isSkipped,
            );
          }
        } else if (isRulePin1) {
          const pinCfg = (rule.params as any)?.pin1Config;

          if (occupiedTapePockets.length > 0) {
            const multiDevicePassRegions = occupiedTapePockets.map((p) => ({
              label: `Pocket #${p.pocketIndex}`,
              region: p.region,
            }));

            for (const pocket of occupiedTapePockets) {
              const pRes = pocket.ruleResults[rule.id];
              const pStatus = pRes?.status ?? effectiveStatus;
              const pScore = pRes?.score ?? effectiveScore;
              const pDebug = pRes?.debug;
              const pocketPinX =
                typeof (pocket as any).pinX === "number" ? (pocket as any).pinX : undefined;
              const pocketPinY =
                typeof (pocket as any).pinY === "number" ? (pocket as any).pinY : undefined;
              const rawHoleX = pDebug?.detectedHoleX ?? pDebug?.nominalX;
              const rawHoleY = pDebug?.detectedHoleY ?? pDebug?.nominalY;
              const isHoleInPocket =
                typeof rawHoleX === "number" &&
                rawHoleX >= pocket.region.x - 10 &&
                rawHoleX <= pocket.region.x + pocket.region.width + 10;
              const holeX = isHoleInPocket ? rawHoleX : (pocketPinX ?? rawHoleX);
              const holeY = isHoleInPocket ? rawHoleY : (pocketPinY ?? rawHoleY);

              if (typeof holeX === "number" && typeof holeY === "number") {
                const markerRoi: WorkpieceRoi = {
                  x: Math.max(0, Math.round(holeX - 25)),
                  y: Math.max(0, Math.round(holeY - 25)),
                  width: 50,
                  height: 50,
                };

                const markerPinCfg = {
                  ...(pinCfg ?? {}),
                  centerX: holeX,
                  centerY: holeY,
                  radius: pinCfg?.radius ?? 11,
                  registeredPin1: {
                    x: holeX,
                    y: holeY,
                    centerX: holeX,
                    centerY: holeY,
                    radius: pinCfg?.radius ?? 11,
                  },
                  packageRegion: pocket.region,
                };

                const markerResult = {
                  status: pStatus,
                  score: pScore,
                  debug: {
                    ...(pDebug ?? {}),
                    nominalX: holeX,
                    nominalY: holeY,
                    detectedHoleX: holeX,
                    detectedHoleY: holeY,
                    hasPin1Found: pStatus === "pass",
                  },
                } as any;

                drawPin1Reticle(
                  ctx,
                  markerRoi,
                  pStatus as "pass" | "fail" | "warn" | "pending" | "skipped",
                  pScore,
                  markerPinCfg,
                  markerResult,
                  isAnalyzeMode,
                );
              }
            }
          } else {
            const ruleDebug = (ruleResult as any)?.debug;
            let multiDevicePin1 = Array.isArray(ruleDebug?.multiDevicePin1)
              ? ruleDebug.multiDevicePin1
              : Array.isArray((rule.params as any)?.multiDevicePin1)
                ? (rule.params as any).multiDevicePin1
                : [];
            // Fallback: construct from tapeStripResult pockets (scripted tour)
            if (multiDevicePin1.length === 0 && tapeStripResult?.pockets) {
              const pocketPins = tapeStripResult.pockets
                .filter((pk: any) => typeof pk.pinX === "number" && typeof pk.pinY === "number")
                .map((pk: any, idx: number) => ({
                  id: `pocket-${idx + 1}`,
                  label: `Device ${idx + 1}`,
                  x: pk.pinX,
                  y: pk.pinY,
                  radius: 11,
                  packageRegion: pk.region,
                }));
              if (pocketPins.length > 0) {
                multiDevicePin1 = pocketPins;
              }
            }
            const multiDevicePassRegions = Array.isArray(ruleDebug?.multiDevicePassRegions)
              ? ruleDebug.multiDevicePassRegions
              : Array.isArray((rule.params as any)?.multiDevicePassRegions)
                ? (rule.params as any).multiDevicePassRegions
                : multiDevicePin1.map((marker: any) => ({
                    label: marker.label,
                    region: marker.packageRegion,
                  }));

            if (multiDevicePin1.length > 0) {
              for (const marker of multiDevicePin1) {
                const markerX = Number(marker.x ?? marker.centerX);
                const markerY = Number(marker.y ?? marker.centerY);
                const markerRadius = Number(marker.radius ?? pinCfg?.radius ?? 11);

                if (!Number.isFinite(markerX) || !Number.isFinite(markerY)) {
                  continue;
                }

                const markerRoi: WorkpieceRoi = {
                  x: Math.max(0, Math.round(markerX - 25)),
                  y: Math.max(0, Math.round(markerY - 25)),
                  width: 50,
                  height: 50,
                };
                const markerPinCfg = {
                  ...(pinCfg ?? {}),
                  centerX: markerX,
                  centerY: markerY,
                  radius: markerRadius,
                  registeredPin1: {
                    x: markerX,
                    y: markerY,
                    centerX: markerX,
                    centerY: markerY,
                    radius: markerRadius,
                  },
                  ...(marker.packageRegion ? { packageRegion: marker.packageRegion } : {}),
                };
                const markerResult = {
                  ...(ruleResult ?? {}),
                  debug: {
                    ...(ruleDebug ?? {}),
                    nominalX: markerX,
                    nominalY: markerY,
                    detectedHoleX: markerX,
                    detectedHoleY: markerY,
                    hasPin1Found: true,
                  },
                } as any;

                drawPin1Reticle(
                  ctx,
                  markerRoi,
                  effectiveStatus,
                  effectiveScore,
                  markerPinCfg,
                  markerResult,
                  isAnalyzeMode,
                );
              }
            } else {
              drawPin1Reticle(
                ctx,
                ruleRoi,
                effectiveStatus,
                effectiveScore,
                pinCfg,
                ruleResult,
                isAnalyzeMode,
              );
            }
          }
        } else if (isRuleCaliper) {
          drawCaliperRuler(ctx, ruleRoi, effectiveStatus);
        } else if (isRuleDefect) {
          drawDefectScanGrid(ctx, ruleRoi, effectiveStatus);
        } else if (isRuleArea) {
          drawAreaGateRegion(ctx, ruleRoi, effectiveStatus);
        } else if (isRuleBlob) {
          drawBlobInspectionRegion(ctx, ruleRoi, effectiveStatus);
        }

        if (isAnalyzing && isSelected) {
          drawScanningLaser(ctx, ruleRoi);
        }
      }

      ctx.restore();

      if (
        isAnalyzeMode ||
        validationStatus ||
        (validationResultsMap && Object.keys(validationResultsMap).length > 0)
      ) {
        if (!(tapeStripResult && tapeStripResult.totalPockets > 1)) {
          drawFrameInspectionHud(
            ctx,
            w,
            rulesToRender.length,
            totalPassCount,
            totalFailCount,
            Boolean(isAnalyzing),
          );
        }
      }
    }
  }, [
    imageElement,
    roi,
    thresholdLuma,
    toolCode,
    toolName,
    activeBoxCount,
    isPatternMatching,
    isPin1,
    isCaliper,
    toolParams,
    isEditable,
    overlayRules,
    selectedRuleId,
    activeBoxesToDraw,
    excludedNumbers,
    validationStatus,
    validationScore,
    validationResultsMap,
    isAnalyzeMode,
    isAnalyzing,
    tapeStripResult,
    autoDetectedBoxesByRuleId,
  ]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const canvas = canvasRef.current;

      if (!canvas) {
        return { x: 0, y: 0 };
      }

      const rect = canvas.getBoundingClientRect();
      const isRectValid = rect.width > 0 && rect.height > 0;
      const scaleX = isRectValid ? canvas.width / rect.width : 1;
      const scaleY = isRectValid ? canvas.height / rect.height : 1;

      const rawX = (clientX - rect.left) * scaleX;
      const rawY = (clientY - rect.top) * scaleY;

      const { fit, sourceScaleX, sourceScaleY } = imageMetrics;
      const localX = sourceScaleX > 0 ? (rawX - fit.x) / sourceScaleX : rawX;
      const localY = sourceScaleY > 0 ? (rawY - fit.y) / sourceScaleY : rawY;

      return {
        x: Math.round(localX),
        y: Math.round(localY),
      };
    },
    [imageMetrics],
  );

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);

    // 0. Corner handles hit test (NW, NE, SW, SE)
    if (isEditable && onChangeRoi) {
      const handleHitRadius = 14;
      const nwHit = Math.hypot(x - roi.x, y - roi.y) <= handleHitRadius;
      const neHit = Math.hypot(x - (roi.x + roi.width), y - roi.y) <= handleHitRadius;
      const swHit = Math.hypot(x - roi.x, y - (roi.y + roi.height)) <= handleHitRadius;
      const seHit = Math.hypot(x - (roi.x + roi.width), y - (roi.y + roi.height)) <= handleHitRadius;

      const hit = nwHit ? "nw" : neHit ? "ne" : swHit ? "sw" : seHit ? "se" : null;

      if (hit) {
        setActiveCornerHandle(hit);
        setDragStartPos({ x, y, initialRoi: { ...roi } });
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

        return;
      }
    }

    // 1. Pin 1 orientation: drag reticle or map new Pin 1 location
    if (isPin1 && onUpdateParams) {
      const currentPin1X =
        (toolParams as any)?.pin1Config?.centerX ??
        (toolParams as any)?.pin1Config?.registeredPin1?.centerX;
      const currentPin1Y =
        (toolParams as any)?.pin1Config?.centerY ??
        (toolParams as any)?.pin1Config?.registeredPin1?.centerY;
      const isReticleHit =
        typeof currentPin1X === "number" &&
        typeof currentPin1Y === "number" &&
        Math.hypot(x - currentPin1X, y - currentPin1Y) <= 18;

      if (isReticleHit) {
        setIsDraggingPin1(true);
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

        return;
      }

      // If clicked inside search region or near the IC: map Pin 1 position
      const isInsideSearchArea =
        x >= roi.x - 20 &&
        x <= roi.x + roi.width + 20 &&
        y >= roi.y - 20 &&
        y <= roi.y + roi.height + 20;

      if (isInsideSearchArea) {
        const nextPin1Config = {
          ...((toolParams as any)?.pin1Config ?? {}),
          centerX: x,
          centerY: y,
          registeredPin1: {
            ...((toolParams as any)?.pin1Config?.registeredPin1 ?? {}),
            x,
            y,
            centerX: x,
            centerY: y,
            radius: (toolParams as any)?.pin1Config?.radius ?? 11,
          },
        };

        onUpdateParams({
          ...toolParams,
          pin1Config: nextPin1Config,
          pin1ConfigJson: JSON.stringify(nextPin1Config),
        });

        return;
      }
    }

    // 2. Pattern box toggle exclusion
    if (isPatternMatching && activeBoxesToDraw.length > 0) {
      const boxUnderCursor = activeBoxesToDraw.find(
        (b) => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height,
      );

      if (boxUnderCursor) {
        setExcludedNumbers((prev) => {
          const next = new Set(prev);

          if (next.has(boxUnderCursor.number)) {
            next.delete(boxUnderCursor.number);
          } else {
            next.add(boxUnderCursor.number);
          }

          return next;
        });

        return;
      }
    }

    // 3. Search Region body drag (move ROI)
    const isInsideRoi =
      x >= roi.x &&
      x <= roi.x + roi.width &&
      y >= roi.y &&
      y <= roi.y + roi.height;

    if (isEditable && onChangeRoi && isInsideRoi) {
      setIsMovingRoi(true);
      setDragStartPos({ x, y, initialRoi: { ...roi } });
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

      return;
    }

    // 4. Click other rule to select
    if (onSelectRule && overlayRules.length > 0) {
      const clickedRule = [...overlayRules]
        .reverse()
        .find(
          (r) =>
            !r.isHidden &&
            !r.isLocked &&
            x >= r.x &&
            x <= r.x + r.width &&
            y >= r.y &&
            y <= r.y + r.height,
        );

      if (clickedRule) {
        onSelectRule(clickedRule.id);

        return;
      }
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);

    if (isDraggingPin1 && onUpdateParams) {
      const nextPin1Config = {
        ...((toolParams as any)?.pin1Config ?? {}),
        centerX: x,
        centerY: y,
        registeredPin1: {
          ...((toolParams as any)?.pin1Config?.registeredPin1 ?? {}),
          x,
          y,
          centerX: x,
          centerY: y,
          radius: (toolParams as any)?.pin1Config?.radius ?? 11,
        },
      };

      onUpdateParams({
        ...toolParams,
        pin1Config: nextPin1Config,
        pin1ConfigJson: JSON.stringify(nextPin1Config),
      });

      return;
    }

    if (isMovingRoi && dragStartPos && onChangeRoi) {
      const dx = x - dragStartPos.x;
      const dy = y - dragStartPos.y;
      const nextRoi = {
        ...dragStartPos.initialRoi,
        x: Math.max(0, dragStartPos.initialRoi.x + dx),
        y: Math.max(0, dragStartPos.initialRoi.y + dy),
      };

      onChangeRoi(nextRoi);

      return;
    }

    if (activeCornerHandle && dragStartPos && onChangeRoi) {
      const shapeType = String((toolParams as any)?.shapeType || "rectangle").toLowerCase();
      let nextRoi = { ...dragStartPos.initialRoi };

      if (activeCornerHandle === "se") {
        nextRoi.width = Math.max(16, x - dragStartPos.initialRoi.x);
        nextRoi.height = Math.max(16, y - dragStartPos.initialRoi.y);
      } else if (activeCornerHandle === "nw") {
        const dx = x - dragStartPos.initialRoi.x;
        const dy = y - dragStartPos.initialRoi.y;
        nextRoi.x = Math.min(x, dragStartPos.initialRoi.x + dragStartPos.initialRoi.width - 16);
        nextRoi.y = Math.min(y, dragStartPos.initialRoi.y + dragStartPos.initialRoi.height - 16);
        nextRoi.width = Math.max(16, dragStartPos.initialRoi.width - dx);
        nextRoi.height = Math.max(16, dragStartPos.initialRoi.height - dy);
      } else if (activeCornerHandle === "ne") {
        const dy = y - dragStartPos.initialRoi.y;
        nextRoi.y = Math.min(y, dragStartPos.initialRoi.y + dragStartPos.initialRoi.height - 16);
        nextRoi.width = Math.max(16, x - dragStartPos.initialRoi.x);
        nextRoi.height = Math.max(16, dragStartPos.initialRoi.height - dy);
      } else if (activeCornerHandle === "sw") {
        const dx = x - dragStartPos.initialRoi.x;
        nextRoi.x = Math.min(x, dragStartPos.initialRoi.x + dragStartPos.initialRoi.width - 16);
        nextRoi.width = Math.max(16, dragStartPos.initialRoi.width - dx);
        nextRoi.height = Math.max(16, y - dragStartPos.initialRoi.y);
      }

      if (shapeType === "square") {
        const side = Math.max(nextRoi.width, nextRoi.height);
        nextRoi.width = side;
        nextRoi.height = side;
      }

      onChangeRoi(nextRoi);

      return;
    }

    if (isEditable && !activeCornerHandle && !isMovingRoi && !isDraggingPin1) {
      const handleHitRadius = 14;
      const nwHit = Math.hypot(x - roi.x, y - roi.y) <= handleHitRadius;
      const neHit = Math.hypot(x - (roi.x + roi.width), y - roi.y) <= handleHitRadius;
      const swHit = Math.hypot(x - roi.x, y - (roi.y + roi.height)) <= handleHitRadius;
      const seHit = Math.hypot(x - (roi.x + roi.width), y - (roi.y + roi.height)) <= handleHitRadius;

      const hover = nwHit ? "nw" : neHit ? "ne" : swHit ? "sw" : seHit ? "se" : null;
      setCursorHandleType(hover);

      const isInside =
        x >= roi.x &&
        x <= roi.x + roi.width &&
        y >= roi.y &&
        y <= roi.y + roi.height;

      setIsHoveringRoi(isInside && !hover);
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (activeCornerHandle) {
      setActiveCornerHandle(null);
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    }

    if (isMovingRoi) {
      setIsMovingRoi(false);
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    }

    if (isDraggingPin1) {
      setIsDraggingPin1(false);
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    }

    setDragStartPos(null);
  }

  const cursorStyle = useMemo(() => {
    if (
      activeCornerHandle === "nw" ||
      activeCornerHandle === "se" ||
      cursorHandleType === "nw" ||
      cursorHandleType === "se"
    ) {
      return "nwse-resize";
    }

    if (
      activeCornerHandle === "ne" ||
      activeCornerHandle === "sw" ||
      cursorHandleType === "ne" ||
      cursorHandleType === "sw"
    ) {
      return "nesw-resize";
    }

    if (isMovingRoi) {
      return "grabbing";
    }

    if (isDraggingPin1) {
      return "crosshair";
    }

    if (isHoveringRoi) {
      return "move";
    }

    if (isPin1) {
      return "crosshair";
    }

    return "default";
  }, [
    activeCornerHandle,
    cursorHandleType,
    isDraggingPin1,
    isHoveringRoi,
    isMovingRoi,
    isPin1,
  ]);

  const visualRulesList = overlayRules.length > 0 ? overlayRules : [];
  const visualPassCount =
    visualRulesList.length > 0
      ? visualRulesList.filter((r) => {
          const res = validationResultsMap?.[r.id];

          return res?.status === "pass" || (r.id === selectedRuleId && validationStatus === "pass");
        }).length
      : validationStatus === "pass"
        ? 1
        : 0;
  const visualFailCount =
    visualRulesList.length > 0
      ? visualRulesList.filter((r) => {
          const res = validationResultsMap?.[r.id];

          return res?.status === "fail" || (r.id === selectedRuleId && validationStatus === "fail");
        }).length
      : validationStatus === "fail"
        ? 1
        : 0;
  const visualTotalCount = visualRulesList.length || 1;
  const isFramePass = visualFailCount === 0 && (visualPassCount > 0 || validationStatus === "pass");
  const isFrameFail = visualFailCount > 0;
  const frameStatusLabel = isAnalyzing
    ? "Scanning"
    : isFrameFail
      ? "Reject"
      : isFramePass
        ? "Pass"
        : "Ready";
  const frameStatusClass = isAnalyzing
    ? "border-cyan-500/50 bg-cyan-950/40 text-cyan-300"
    : isFrameFail
      ? "border-rose-500/50 bg-rose-950/50 text-rose-300"
      : isFramePass
        ? "border-emerald-500/50 bg-emerald-950/50 text-emerald-300"
        : "border-ca-border bg-ca-panel-2 text-ca-ink-muted";

  return (
    <div className="flex min-h-0 h-full w-full select-none flex-col overflow-hidden rounded border border-ca-border bg-[#0c1014]">
      {/* Top HUD Controls (Consolidated Slim Status Bar) */}
      {/* Fixed height, single row: the HUD must never wrap to a second line
          when the selected rule changes, or the viewport below it (and the
          displayed image) resizes with it. Overflow scrolls horizontally. */}
      <div className="border-b border-ca-border bg-[#11161b] text-xs">
        <div className="flex h-11 flex-nowrap items-center justify-between gap-1.5 overflow-hidden px-3 py-1.5">
          <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto">
            <span className="flex shrink-0 items-center gap-1.5 font-bold uppercase tracking-[0.14em] text-ca-ink">
              <ScanSearch size={14} className="text-ca-select" />
              {isAnalyzeMode ? "Analysis:" : "Inspection:"}
            </span>
            <span
              data-tour="project-analysis-canvas-status"
              className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${frameStatusClass}`}
            >
              {isAnalyzeMode
                ? `${frameStatusLabel} · ${visualPassCount}/${visualTotalCount}`
                : toolName || "Autonomous Tool Inspection"}
            </span>
            {isPatternMatching && (
              <span className="shrink-0 rounded border border-ca-border/70 bg-[#0b0f12] px-1.5 py-0.5 font-mono text-[11px] text-ca-ink-muted">
                {(() => {
                  const count =
                    activeBoxesToDraw.length > 0
                      ? activeBoxesToDraw.length
                      : activeBoxCount > 0
                        ? activeBoxCount
                        : parseBoxesFromParams(toolParams).length;

                  return count > 0 ? `${count} Pattern Elements` : "Pattern Elements";
                })()}
              </span>
            )}
            {isPin1 && (
              <span className="shrink-0 rounded border border-cyan-500/40 bg-cyan-950/30 px-1.5 py-0.5 font-mono text-[11px] text-cyan-400">
                Pin 1 Reticle Calibrated
              </span>
            )}
            {isAnalyzeMode && overlayRules.length > 0 && (
              <div className="flex shrink-0 flex-nowrap items-center gap-1 pl-1">
                {overlayRules.map((r, i) => {
                  const res = validationResultsMap?.[r.id];
                  const isSelected = r.id === selectedRuleId;
                  const isPass =
                    res?.status === "pass" || (isSelected && validationStatus === "pass");
                  const isFail = res?.status === "fail";

                  return (
                    <button
                      key={r.id}
                      type="button"
                      aria-label={`Select ${r.params?.toolCode || `Rule ${i + 1}`}`}
                      title={`Focus rule ${r.name || r.params?.toolCode || `R${i + 1}`}`}
                      onClick={() => onSelectRule?.(r.id)}
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold transition ${
                        isSelected
                          ? "border border-cyan-400 bg-cyan-950/70 text-cyan-200 shadow-xs"
                          : isPass
                            ? "border border-emerald-500/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50"
                            : isFail
                              ? "border border-red-500/50 bg-red-950/40 text-red-300"
                              : "border border-ca-border/80 bg-ca-panel-2 text-ca-ink-muted hover:text-white"
                      }`}
                    >
                      <span>{isPass ? "✔" : isFail ? "✖" : "●"}</span>
                      <span>{r.params?.toolCode || `R${i + 1}`}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {!isAnalyzeMode && isPatternMatching && (
              <button
                type="button"
                onClick={() => handleDetectElements(true)}
                className="inline-flex items-center gap-1.5 rounded border border-ca-border bg-ca-panel px-2 py-1 text-xs font-semibold text-ca-ink transition hover:bg-ca-panel-2"
                title="Run 2-bit connected components detection to extract real pattern elements"
              >
                <Sparkles size={13} className="text-ca-select" />
                Detect Elements ({activeBoxesToDraw.length})
              </button>
            )}

            {!isAnalyzeMode && onLaunchPatternTuner && (
              <button
                type="button"
                onClick={onLaunchPatternTuner}
                className="inline-flex items-center gap-1.5 rounded border border-ca-select/40 bg-ca-select/15 px-2.5 py-1 text-xs font-semibold text-ca-select transition hover:bg-ca-select/25"
              >
                <Sliders size={13} />
                Tune Tool Visually
              </button>
            )}

            <div className="flex items-center rounded border border-ca-border bg-[#0b0f12]">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                className="p-1 text-ca-ink-muted hover:text-ca-ink"
                title="Zoom out"
              >
                <ZoomOut size={13} />
              </button>
              <span className="px-1.5 font-mono text-[11px] text-ca-ink">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                className="p-1 text-ca-ink-muted hover:text-ca-ink"
                title="Zoom in"
              >
                <ZoomIn size={13} />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="border-l border-ca-border p-1 text-ca-ink-muted hover:text-ca-ink"
                title="Reset Zoom"
              >
                <Maximize size={12} />
              </button>
            </div>

            {onRunAnalysis && (
              <button
                type="button"
                onClick={onRunAnalysis}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-600/20 px-2.5 py-1 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-600/30 disabled:opacity-50"
                title="Run automated optical inspection analysis on workpiece image"
              >
                <PlayCircle size={13} className={isAnalyzing ? "animate-spin" : ""} />
                {isAnalyzing ? "Analyzing..." : "Analyze Inspection"}
              </button>
            )}

            {actionSlot}
          </div>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div
        ref={containerRef}
        className="relative flex min-h-[140px] flex-1 items-center justify-center overflow-auto bg-[#050607] p-1.5"
      >
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />

        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          tabIndex={isEditable ? 0 : -1}
          role="img"
          aria-label="Workpiece Inspection Canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: "center center",
            cursor: cursorStyle,
            touchAction: "none",
          }}
          className="relative aspect-video max-h-full max-w-full rounded-sm border border-ca-border/80 object-contain shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_80px_rgba(0,0,0,0.55)] outline-none transition-transform duration-75 focus:ring-1 focus:ring-ca-select"
        />
        {isAnalyzing ? (
          <div
            data-testid="visual-analysis-loading"
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/45 backdrop-blur-[1px]"
          >
            <div className="flex items-center gap-3 rounded-lg border border-cyan-400/40 bg-[#07131a]/95 px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-cyan-200 shadow-[0_16px_50px_rgba(0,0,0,0.55),0_0_24px_rgba(34,211,238,0.18)]">
              <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
              Analyzing image…
            </div>
          </div>
        ) : null}
      </div>

      {/* Dedicated Visual Analysis Results Area (Separated from image, NOT on the image) */}
      {(validationStatus ||
        (validationResultsMap && Object.keys(validationResultsMap).length > 0)) && (
        <section
          data-tour="project-analysis-results"
          aria-label="Visual Analysis Results"
          className="flex max-h-32 shrink-0 flex-col gap-1.5 overflow-y-auto border-t border-ca-border/80 bg-[#10161b] p-2 font-mono text-xs shadow-inner"
        >
          {(() => {
            const rulesList = visualRulesList;
            const passCount = visualPassCount;
            const failCount = visualFailCount;
            const effectiveStatus = isFrameFail ? "fail" : isFramePass ? "pass" : "warn";

            return (
              <>
                <div className="flex items-center justify-between gap-2 border-b border-ca-border/50 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                        effectiveStatus === "pass"
                          ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-400"
                          : effectiveStatus === "fail"
                            ? "border-rose-500/40 bg-rose-500/20 text-rose-400"
                            : "border-amber-500/40 bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {effectiveStatus === "pass" ? (
                        <CheckCircle2 size={13} />
                      ) : effectiveStatus === "fail" ? (
                        <XCircle size={13} />
                      ) : (
                        <AlertCircle size={13} />
                      )}
                      {effectiveStatus.toUpperCase()}
                      {typeof validationScore === "number"
                        ? ` ${(validationScore * 100).toFixed(1)}%`
                        : ""}
                    </span>
                    <span className="text-ca-ink-muted text-[10px] uppercase font-semibold">
                      VISUAL ANALYSIS ({passCount}/{rulesList.length || 1} PASS)
                    </span>
                  </div>
                  <div className="hidden items-center gap-2 text-[10px] uppercase tracking-wider text-ca-ink-muted sm:flex">
                    <span>Rules {rulesList.length || 1}</span>
                    <span className="text-ca-border">|</span>
                    <span className="text-emerald-400">Pass {passCount}</span>
                    <span className="text-rose-400">Fail {failCount}</span>
                  </div>
                </div>

                {/* All Rules Verdict Pills */}
                {rulesList.length > 0 && (
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-1.5 py-1">
                    {rulesList.map((r, idx) => {
                      const rRes = validationResultsMap?.[r.id];
                      const rStatus =
                        rRes?.status ?? (r.id === selectedRuleId ? validationStatus : undefined);
                      const rScore =
                        rRes?.score ?? (r.id === selectedRuleId ? validationScore : undefined);
                      const isAct = r.id === selectedRuleId;

                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => onSelectRule?.(r.id)}
                          className={`flex min-w-0 items-center justify-between gap-2 rounded border px-2 py-1 text-[10px] font-mono transition ${
                            rStatus === "pass"
                              ? "border-emerald-700/70 bg-emerald-950/70 text-emerald-300 hover:bg-emerald-900/80"
                              : rStatus === "fail"
                                ? "border-rose-700/70 bg-rose-950/70 text-rose-300 hover:bg-rose-900/80"
                                : rStatus === "warn"
                                  ? "border-amber-700/70 bg-amber-950/70 text-amber-300 hover:bg-amber-900/80"
                                  : "border-ca-border/60 bg-ca-panel text-ca-ink-muted hover:text-ca-ink"
                          } ${isAct ? "ring-1 ring-cyan-400 font-semibold" : ""}`}
                          title={`Focus rule [${idx + 1}] ${r.name}`}
                        >
                          <span className="min-w-0 truncate">
                            [{idx + 1}] {r.name}:
                          </span>
                          <span className="shrink-0 font-bold">
                            {rStatus ? rStatus.toUpperCase() : "READY"}
                            {typeof rScore === "number" ? ` ${(rScore * 100).toFixed(0)}%` : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </section>
      )}

      {!isAnalyzeMode && (
        <div className="flex items-center justify-between px-3 py-1 bg-ca-panel text-[11px] text-ca-ink-muted border-t border-ca-border">
          <span>
            Visual Tool Inspection Canvas. Click pattern boxes to toggle exclusion. Rules inspect
            automatically.
          </span>
          {isPatternMatching && (
            <span className="text-ca-select font-mono">
              Tool: Greyscale Pattern Matching (Live Pattern Boxes)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
