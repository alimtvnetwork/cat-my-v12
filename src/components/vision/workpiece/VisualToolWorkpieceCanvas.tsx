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
  ScanSearch,
} from "lucide-react";
import defaultWorkpieceSample from "@/assets/samples/pocket-1-filled.jpg";
import {
  markWhiteBoxes,
  type WhiteBoxMark,
} from "@/lib/vision/white-box-marking";
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
} from "@/lib/vision/workpiece-rule-analyzer";

export interface WorkpieceRoi {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RuleValidationDetail {
  status: "pass" | "fail" | "warn" | "pending";
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
  validationStatus?: "pass" | "fail" | "warn" | "pending";
  validationScore?: number;
  validationResultsMap?: Record<string, RuleValidationDetail>;
  onRunAnalysis?: () => void;
  isAnalyzing?: boolean;
}

function clampValue(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function drawCompletePatternOverlay(
  ctx: CanvasRenderingContext2D,
  boxes: readonly WhiteBoxMark[],
  excludedNumbers: ReadonlySet<number>,
  status?: "pass" | "fail" | "warn" | "pending",
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

  drawPatternBoxes(ctx, boxes, excludedNumbers, status);

  if (geometry) {
    drawFormulatedEnvelope(ctx, geometry, status);
  }
}

function drawRealBoxes(
  ctx: CanvasRenderingContext2D,
  boxes: readonly WhiteBoxMark[],
  excludedNumbers: ReadonlySet<number>,
  status?: "pass" | "fail" | "warn" | "pending",
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
  status?: "pass" | "fail" | "warn" | "pending",
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
    const isMatched =
      matchedBoxesMap.has(b.number)
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

  // 1. Zero-ROI: Enclosing envelope bounding box eliminated; render individual feature marks directly

  // 2. Draw all individual character boxes with color-coded results
  for (const b of boxes) {
    const isMatched =
      matchedBoxesMap.has(b.number)
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
  status?: "pass" | "fail" | "warn" | "pending",
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

  drawCompletePatternOverlay(
    ctx,
    synthBoxes,
    new Set(),
    status,
    8,
    imageWidth,
    imageHeight,
  );
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
  status?: "pass" | "fail" | "warn" | "pending",
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

  if (
    typeof debugNomX === "number" &&
    typeof debugNomY === "number"
  ) {
    nomX = debugNomX;
    nomY = debugNomY;
  } else if (
    typeof rawNomX === "number" &&
    typeof rawNomY === "number"
  ) {
    nomX = rawNomX;
    nomY = rawNomY;
  } else if (typeof pin1Config?.relativeX === "number" && typeof pin1Config?.relativeY === "number") {
    nomX = Math.round(roi.x + (pin1Config.relativeX / 100) * roi.width);
    nomY = Math.round(roi.y + (pin1Config.relativeY / 100) * roi.height);
  } else if (typeof regPin1Raw?.relativeX === "number" && typeof regPin1Raw?.relativeY === "number") {
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
  const tolStr = ruleResult?.debug?.tolerancePx !== undefined ? ` (±${ruleResult.debug.tolerancePx}px)` : "";
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
  status?: "pass" | "fail" | "warn" | "pending",
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
  status?: "pass" | "fail" | "warn" | "pending",
): void {
  const color = status === "fail" ? "#ef4444" : status === "pass" ? "#10b981" : "#00e5ff";

  ctx.strokeStyle =
    status === "fail" ? "rgba(239, 68, 68, 0.35)" : "rgba(16, 185, 129, 0.30)";
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

function drawRuleResultBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ruleName: string,
  toolCode: string,
  status: "pass" | "fail" | "warn" | "pending" | undefined,
  score: number | undefined,
  isSelected: boolean,
): void {
  const isPass = status === "pass";
  const isFail = status === "fail";
  const isWarn = status === "warn";

  const statusText = isPass
    ? `✔ PASS ${typeof score === "number" ? `${Math.round(score * 100)}%` : "100%"}`
    : isFail
      ? `✖ FAIL ${typeof score === "number" ? `${Math.round(score * 100)}%` : ""}`
      : isWarn
        ? "⚠ WARN"
        : isSelected
          ? "● SCANNING"
          : "READY";

  const statusColor = isPass
    ? "#10b981"
    : isFail
      ? "#ef4444"
      : isWarn
        ? "#f59e0b"
        : isSelected
          ? "#00e5ff"
          : "#94a3b8";

  const cleanName = ruleName.length > 24 ? `${ruleName.slice(0, 22)}...` : ruleName;
  const label = toolCode ? `[${toolCode}] ${cleanName}` : cleanName;

  ctx.font = "bold 10px monospace";
  const statusWidth = ctx.measureText(statusText).width;
  ctx.font = "10px sans-serif";
  const labelWidth = ctx.measureText(` ${label}`).width;

  const badgeW = Math.max(120, statusWidth + labelWidth + 14);
  const badgeH = 19;
  const badgeY = Math.max(2, y - badgeH - 3);

  ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
  ctx.fillRect(x, badgeY, badgeW, badgeH);

  ctx.fillStyle = statusColor;
  ctx.fillRect(x, badgeY, 3, badgeH);

  ctx.strokeStyle = statusColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, badgeY, badgeW, badgeH);

  ctx.fillStyle = statusColor;
  ctx.font = "bold 10px monospace";
  ctx.fillText(statusText, x + 7, badgeY + 13);

  ctx.fillStyle = "#ffffff";
  ctx.font = "10px sans-serif";
  ctx.fillText(` ${label}`, x + 7 + statusWidth, badgeY + 13);
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
    ctx.fillText(`${passCount}/${totalRules} rules passed inspection limits.`, hudX + 12, hudY + 28);
  } else {
    ctx.fillStyle = "#38bdf8";
    ctx.fillText(`FRAME READY (${totalRules} RULES)`, hudX + 12, hudY + 15);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px sans-serif";
    ctx.fillText("Optical acquisition calibrated. Ready to inspect.", hudX + 12, hudY + 28);
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
}: VisualToolWorkpieceCanvasProps): React.JSX.Element {
  const roi = useMemo(
    () => propRoi ?? { x: 0, y: 0, width: 960, height: 540 },
    [propRoi],
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [detectedBoxes, setDetectedBoxes] = useState<WhiteBoxMark[]>([]);
  const [excludedNumbers, setExcludedNumbers] = useState<Set<number>>(new Set());
  const [autoDetectedBoxesByRuleId, setAutoDetectedBoxesByRuleId] = useState<
    Record<string, WhiteBoxMark[]>
  >({});

  const imgSrc = imageRef || defaultWorkpieceSample;

  useEffect(() => {
    let isMounted = true;
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
        const w = 960;
        const h = 540;
        const offCanvas = document.createElement("canvas");
        offCanvas.width = w;
        offCanvas.height = h;
        const offCtx = offCanvas.getContext("2d", { willReadFrequently: true });

        if (offCtx) {
          offCtx.drawImage(loadedImg, 0, 0, w, h);
          const imgData = offCtx.getImageData(0, 0, w, h);
          registerWorkpieceImageCache(imgSrc, { width: w, height: h, rgba: imgData.data });
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
    toolCode === "T102" ||
    toolCode === "greyscale_pattern_match";

  const isPin1 =
    Boolean(toolName?.toLowerCase().includes("pin 1")) ||
    toolCode === "T105" ||
    toolCode === "pin1_config";

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

      const w = 960;
      const h = 540;
      const offscreen = document.createElement("canvas");
      offscreen.width = w;
      offscreen.height = h;
      const offCtx = offscreen.getContext("2d");

      if (!offCtx) {
        return;
      }

      offCtx.drawImage(imageElement, 0, 0, w, h);
      const imgData = offCtx.getImageData(0, 0, w, h);

      const result = markWhiteBoxes({
        width: w,
        height: h,
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

    const w = 960;
    const h = 540;
    const offscreen = document.createElement("canvas");
    offscreen.width = w;
    offscreen.height = h;
    const offCtx = offscreen.getContext("2d");

    if (!offCtx) {
      return;
    }

    offCtx.drawImage(imageElement, 0, 0, w, h);
    const imgData = offCtx.getImageData(0, 0, w, h);
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
        width: w,
        height: h,
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

    if (!canvas || !imageElement) {
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

    // Always render natural camera/workpiece image
    ctx.drawImage(imageElement, 0, 0, w, h);

    const rulesToRender = overlayRules.length > 0 ? overlayRules : [];
    const activeDisplayRoi = roi;

    if (rulesToRender.length === 0) {
      if (isAnalyzeMode) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(w / 2 - 220, h / 2 - 25, 440, 50);
        ctx.strokeStyle = "rgba(100, 116, 139, 0.5)";
        ctx.strokeRect(w / 2 - 220, h / 2 - 25, 440, 50);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("No rules defined. Click 'Add rule from tools' to start inspection.", w / 2, h / 2 + 5);
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

      // Zero-ROI: Render intrinsic inspection features only without artificial bounding box
      drawRuleResultBadge(
        ctx,
        roi.x,
        roi.y,
        toolName || "Inspection Rule",
        toolCode || "",
        validationStatus,
        validationScore,
        true,
      );

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
        drawFrameInspectionHud(
          ctx,
          w,
          1,
          isPass ? 1 : 0,
          isFailed ? 1 : 0,
          Boolean(isAnalyzing),
        );
      }
    } else {
      let totalPassCount = 0;
      let totalFailCount = 0;

      for (let idx = 0; idx < rulesToRender.length; idx += 1) {
        const rule = rulesToRender[idx];

        if (rule.isHidden) {
          continue;
        }

        const isSelected = rule.id === selectedRuleId;
        const ruleResult = validationResultsMap?.[rule.id];
        const status = ruleResult?.status ?? (isSelected ? validationStatus : undefined);
        const score = ruleResult?.score ?? (isSelected ? validationScore : undefined);

        if (status === "pass") {
          totalPassCount += 1;
        }

        if (status === "fail") {
          totalFailCount += 1;
        }

        const isFailed = status === "fail";
        const isWarn = status === "warn";
        const isPass = status === "pass";

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
          effectiveToolCode === "T103" ||
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

        // Zero-ROI: Render intrinsic features only, without artificial bounding box rectangles
        let badgeX = ruleX;
        let badgeY = ruleY;

        if (isRulePin1) {
          const pinCfg = (rule.params as any)?.pin1Config;
          const ruleDebug = (ruleResult as any)?.debug;
          const debugHoleX = ruleDebug?.detectedHoleX ?? ruleDebug?.nominalX;
          const debugHoleY = ruleDebug?.detectedHoleY ?? ruleDebug?.nominalY;
          const hX = debugHoleX ?? pinCfg?.centerX ?? pinCfg?.registeredPin1?.centerX ?? pinCfg?.registeredPin1?.x;
          const hY = debugHoleY ?? pinCfg?.centerY ?? pinCfg?.registeredPin1?.centerY ?? pinCfg?.registeredPin1?.y;

          if (typeof hX === "number" && typeof hY === "number") {
            badgeX = Math.max(10, Math.round(hX - 60));
            badgeY = Math.max(25, Math.round(hY - 20));
          }
        }

        drawRuleResultBadge(
          ctx,
          badgeX,
          badgeY,
          rule.name,
          effectiveToolCode,
          status,
          score,
          isSelected,
        );

        const isRuleDefect =
          effectiveToolCode === "T118" ||
          ruleNameLower.includes("defect") ||
          ruleNameLower.includes("flaw");

        if (isRulePattern) {
          const effectiveRegion: WorkpieceRoi = { x: ruleX, y: ruleY, width: ruleW, height: ruleH };
          const ruleBoxesFromParams = parseBoxesFromParams(rule.params, effectiveRegion);
          const boxResults = (ruleResult as any)?.debug?.boxResults;
          const isSkipped = Boolean((ruleResult as any)?.debug?.isSkipped);
          const ruleBoxes =
            Array.isArray(boxResults) && boxResults.length > 0
                ? boxResults.map((br: any) => ({
                    number: br.boxNumber,
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
            status,
            score,
            boxResults,
            isAnalyzeMode,
            isSkipped,
          );
        } else if (isRulePin1) {
          drawPin1Reticle(
            ctx,
            ruleRoi,
            status,
            score,
            (rule.params as any)?.pin1Config,
            ruleResult,
            isAnalyzeMode,
          );
        } else if (isRuleCaliper) {
          drawCaliperRuler(ctx, ruleRoi, status);
        } else if (isRuleDefect) {
          drawDefectScanGrid(ctx, ruleRoi, status);
        }

        if (isAnalyzing && isSelected) {
          drawScanningLaser(ctx, ruleRoi);
        }
      }

      if (
        isAnalyzeMode ||
        validationStatus ||
        (validationResultsMap && Object.keys(validationResultsMap).length > 0)
      ) {
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
    autoDetectedBoxesByRuleId,
  ]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  function getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();
    const isRectValid = rect.width > 0 && rect.height > 0;
    const scaleX = isRectValid ? canvas.width / rect.width : 1;
    const scaleY = isRectValid ? canvas.height / rect.height : 1;

    return {
      x: Math.round((clientX - rect.left) * scaleX),
      y: Math.round((clientY - rect.top) * scaleY),
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);

    // 1. First priority: Check if user clicked on an individual pattern box (to toggle exclusion)
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

    // 2. Second priority: Check if user clicked on another rule to select it
    if (onSelectRule && overlayRules.length > 0) {
      const clickedRule = [...overlayRules].reverse().find(
        (r) => !r.isHidden && x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height,
      );

      if (clickedRule) {
        onSelectRule(clickedRule.id);

        return;
      }
    }
  }

  function handlePointerMove(_e: React.PointerEvent<HTMLCanvasElement>) {
    // Zero-ROI: manual ROI dragging is disabled
  }

  function handlePointerUp(_e: React.PointerEvent<HTMLCanvasElement>) {
    // Zero-ROI: manual ROI dragging is disabled
  }

  const cursorStyle = useMemo(() => {
    return "default";
  }, []);

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
      {/* Top HUD Controls */}
      <div className="border-b border-ca-border bg-[#11161b] text-xs">
        <div className="flex flex-wrap items-center justify-between gap-1.5 px-2 py-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-[0.14em] text-ca-ink">
              <ScanSearch size={14} className="text-ca-select" />
              {isAnalyzeMode ? "Auto-Analysis:" : "Auto-Inspection:"}
            </span>
            <span className="rounded border border-ca-border/70 bg-[#0b0f12] px-2 py-0.5 font-mono text-xs text-emerald-400">
              {isAnalyzeMode
                ? isAnalyzing
                  ? "Scanning Full Workpiece..."
                  : "Full Picture Auto-Analyzed"
                : (toolName || "Autonomous Tool Inspection")}
            </span>
            {isPatternMatching && (
              <span className="rounded border border-ca-border/70 bg-[#0b0f12] px-1.5 py-0.5 font-mono text-xs text-ca-ink-muted">
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
              <span className="rounded border border-cyan-500/40 bg-cyan-950/30 px-1.5 py-0.5 font-mono text-xs text-cyan-400">
                Pin 1 Reticle Calibrated
              </span>
            )}
            {isAnalyzeMode && (
              <span className={`rounded border px-2 py-0.5 font-mono text-xs font-bold uppercase ${frameStatusClass}`}>
                {frameStatusLabel} · {visualPassCount}/{visualTotalCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
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
        {isAnalyzeMode && overlayRules.length > 0 && (
          <div className="absolute left-4 top-4 z-10 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-2 rounded border border-ca-border/80 bg-[#10161c]/95 px-3 py-1.5 font-mono text-xs shadow-lg backdrop-blur-xs">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-[0.12em] text-ca-ink">
              <span
                className={`h-2 w-2 rounded-full ${
                  isAnalyzing
                    ? "bg-cyan-400 animate-ping"
                    : "bg-emerald-400"
                }`}
              />
              {isAnalyzing ? "Scanning Workpiece..." : "Visual Analysis Overlay"}
            </span>
            <span className="text-ca-border">|</span>
            <div className="flex items-center gap-1">
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
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold transition ${
                      isSelected
                        ? "border border-cyan-400 bg-cyan-950/70 text-cyan-200 shadow-xs"
                        : isPass
                          ? "border border-emerald-500/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50"
                          : isFail
                            ? "border border-red-500/50 bg-red-950/40 text-red-300"
                            : "border border-ca-border bg-ca-panel-2 text-ca-ink-muted"
                    }`}
                  >
                    <span>{isPass ? "✔" : isFail ? "✖" : "●"}</span>
                    <span>{r.params?.toolCode || `R${i + 1}`}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
      </div>

      {/* Dedicated Visual Analysis Results Area (Separated from image, NOT on the image) */}
      {(validationStatus ||
        (validationResultsMap && Object.keys(validationResultsMap).length > 0)) && (
        <section
          aria-label="Visual Analysis Results"
          className="flex max-h-24 shrink-0 flex-col gap-1.5 overflow-y-auto border-t border-ca-border/80 bg-[#10161b] p-1.5 font-mono text-xs shadow-inner"
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

                {/* Active Rule Details */}
                {(() => {
                  const activeRule = overlayRules.find((r) => r.id === selectedRuleId);
                  const activeResult = selectedRuleId
                    ? validationResultsMap?.[selectedRuleId]
                    : undefined;
                  const displayRuleName = activeRule?.name || toolName || "Active Rule";
                  const displayToolCode = String(
                    activeRule?.params?.toolCode || toolCode || "T102",
                  );
                  const displayScore =
                    typeof activeResult?.score === "number"
                      ? activeResult.score
                      : typeof validationScore === "number"
                        ? validationScore
                        : activeResult?.status === "pass" || validationStatus === "pass"
                          ? 1.0
                          : undefined;

                  const isPatternMatch = activeRule
                    ? Boolean(
                        displayToolCode === "T102" ||
                        displayToolCode === "T116" ||
                        displayRuleName.toLowerCase().includes("pattern") ||
                        displayRuleName.toLowerCase().includes("white box"),
                      )
                    : isPatternMatching;

                  const activeRuleRoi = activeRule
                    ? {
                        x: activeRule.x,
                        y: activeRule.y,
                        width: activeRule.width,
                        height: activeRule.height,
                      }
                    : roi;

                  const parsedActiveRuleBoxes = parseBoxesFromParams(
                    activeRule?.params,
                    activeRuleRoi,
                  );

                  const ruleBoxes =
                    parsedActiveRuleBoxes.length > 0
                      ? parsedActiveRuleBoxes
                      : activeBoxesToDraw;

                  const totalCount =
                    ruleBoxes.length > 0
                      ? ruleBoxes.length
                      : typeof activeRule?.params?.activeBoxCount === "number"
                        ? (activeRule.params.activeBoxCount as number)
                        : typeof toolParams?.activeBoxCount === "number"
                          ? (toolParams.activeBoxCount as number)
                          : activeBoxCount;

                  const scoreFraction =
                    typeof displayScore === "number"
                      ? displayScore
                      : activeResult?.status === "fail" || validationStatus === "fail"
                        ? 0.0
                        : 1.0;

                  const debugMatched = (activeResult as any)?.debug?.matchedCount;
                  const matchedCount =
                    typeof debugMatched === "number"
                      ? debugMatched
                      : activeResult?.status === "pass" || (!activeResult && validationStatus !== "fail")
                        ? Math.max(0, totalCount - excludedNumbers.size)
                        : Math.round(totalCount * scoreFraction);

                  const percent =
                    totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 100;

                  return (
                    <div
                      className={`grid grid-cols-1 sm:grid-cols-2 ${
                        isAnalyzeMode ? "md:grid-cols-3" : "md:grid-cols-4"
                      } gap-2 border-t border-ca-border/40 pt-2 text-[11px] text-ca-ink`}
                    >
                      <div className="flex flex-col rounded border border-ca-border/50 bg-[#0b0f12] px-2 py-1">
                        <span className="text-[10px] uppercase tracking-wider text-ca-ink-muted">Feature Rule</span>
                        <span className="truncate">
                          <strong>{displayRuleName}</strong> [{displayToolCode}]
                        </span>
                      </div>

                      <div className="flex flex-col rounded border border-ca-border/50 bg-[#0b0f12] px-2 py-1">
                        <span className="text-[10px] uppercase tracking-wider text-ca-ink-muted">Match Score</span>
                        <strong>
                          {typeof displayScore === "number"
                            ? `${(displayScore * 100).toFixed(1)}%`
                            : "100%"}
                        </strong>
                      </div>

                      {isPatternMatch && (
                        <div className="flex flex-col rounded border border-ca-border/50 bg-[#0b0f12] px-2 py-1">
                          <span className="text-[10px] uppercase tracking-wider text-ca-ink-muted">Pattern Elements</span>
                          <strong>
                            {matchedCount} / {totalCount} matched ({percent}%)
                          </strong>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
