import { regionHandles } from "./pattern-geometry";
import type {
  BoxToleranceZone,
  FormulatedPatternGeometry,
  SearchRegion,
  WhiteBoxMark,
} from "./types";

export function drawSearchRegion(_context: CanvasRenderingContext2D, _region: SearchRegion): void {
  // Zero-ROI: Bounding box rectangles and resize handles eliminated
}

export function drawPatternBoxes(
  context: CanvasRenderingContext2D,
  boxes: readonly WhiteBoxMark[],
  excludedNumbers: ReadonlySet<number>,
  status?: "pass" | "fail" | "warn" | "pending",
): void {
  context.save();

  const isPass = status === "pass";
  const isFailed = status === "fail";
  const isWarn = status === "warn";
  const activeColor = isPass ? "#10b981" : isWarn ? "#f59e0b" : "#ef4444";
  const activeFill = isPass
    ? "rgba(16, 185, 129, 0.16)"
    : isWarn
      ? "rgba(245, 158, 11, 0.15)"
      : isFailed
        ? "rgba(239, 68, 68, 0.15)"
        : "rgba(239, 68, 68, 0.08)";

  for (const box of boxes) {
    const isExcluded = excludedNumbers.has(box.number);

    if (isExcluded) {
      context.strokeStyle = "rgba(244, 63, 94, 0.4)";
      context.lineWidth = 1;
      context.setLineDash([4, 4]);
      context.strokeRect(box.x + 0.5, box.y + 0.5, box.width, box.height);
    } else {
      context.strokeStyle = activeColor;
      context.lineWidth = 2;
      context.setLineDash([]);
      context.fillStyle = activeFill;
      context.fillRect(box.x + 0.5, box.y + 0.5, box.width, box.height);
      context.strokeRect(box.x + 0.5, box.y + 0.5, box.width, box.height);

      const text = String(box.number);
      const badgeW = Math.max(16, text.length * 7 + 6);
      const badgeY = box.y >= 14 ? box.y - 13 : box.y + 2;

      context.fillStyle = activeColor;
      context.fillRect(box.x, badgeY, badgeW, 12);
      context.fillStyle = "#ffffff";
      context.font = "bold 9px monospace";
      context.fillText(text, box.x + 3, badgeY + 9);
    }
  }

  context.restore();
}

export function drawFormulatedEnvelope(
  _context: CanvasRenderingContext2D,
  _pattern: FormulatedPatternGeometry,
  _status?: "pass" | "fail" | "warn" | "pending",
): void {
  // Zero-ROI: Enclosing bounding boxes eliminated
}

export function drawToleranceZones(
  context: CanvasRenderingContext2D,
  zones: readonly BoxToleranceZone[],
): void {
  context.save();
  context.strokeStyle = "rgba(56, 189, 248, 0.7)";
  context.lineWidth = 1;
  context.setLineDash([3, 3]);

  for (const zone of zones) {
    context.strokeRect(zone.x + 0.5, zone.y + 0.5, zone.width, zone.height);
    context.fillStyle = "rgba(56, 189, 248, 0.08)";
    context.fillRect(zone.x, zone.y, zone.width, zone.height);
  }

  context.restore();
}
