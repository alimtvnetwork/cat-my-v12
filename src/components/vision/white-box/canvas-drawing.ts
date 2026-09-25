import { regionHandles } from "./pattern-geometry";
import type {
  BoxToleranceZone,
  FormulatedPatternGeometry,
  SearchRegion,
  WhiteBoxMark,
} from "./types";

export function drawSearchRegion(context: CanvasRenderingContext2D, region: SearchRegion): void {
  context.save();
  context.strokeStyle = "#22d3ee";
  context.lineWidth = 2;
  context.setLineDash([8, 5]);
  context.strokeRect(region.x + 0.5, region.y + 0.5, region.width, region.height);
  context.setLineDash([]);
  context.fillStyle = "#22d3ee";
  context.strokeStyle = "#001015";

  for (const handle of regionHandles(region)) {
    context.fillRect(handle.x - 4, handle.y - 4, 8, 8);
    context.strokeRect(handle.x - 4.5, handle.y - 4.5, 9, 9);
  }

  context.restore();
}

export function drawPatternBoxes(
  context: CanvasRenderingContext2D,
  boxes: readonly WhiteBoxMark[],
  excludedNumbers: ReadonlySet<number>,
): void {
  context.save();

  for (const box of boxes) {
    const isExcluded = excludedNumbers.has(box.number);

    if (isExcluded) {
      context.strokeStyle = "rgba(244, 63, 94, 0.4)";
      context.lineWidth = 1;
      context.setLineDash([4, 4]);
      context.strokeRect(box.x + 0.5, box.y + 0.5, box.width, box.height);
    } else {
      context.strokeStyle = "#ef4444";
      context.lineWidth = 2;
      context.setLineDash([]);
      context.strokeRect(box.x + 0.5, box.y + 0.5, box.width, box.height);

      const text = String(box.number);
      const badgeW = Math.max(16, text.length * 7 + 6);
      const badgeY = box.y >= 14 ? box.y - 13 : box.y + 2;

      context.fillStyle = "#ef4444";
      context.fillRect(box.x, badgeY, badgeW, 12);
      context.fillStyle = "#ffffff";
      context.font = "bold 9px monospace";
      context.fillText(text, box.x + 3, badgeY + 9);
    }
  }

  context.restore();
}

export function drawFormulatedEnvelope(
  context: CanvasRenderingContext2D,
  pattern: FormulatedPatternGeometry,
): void {
  context.save();
  context.strokeStyle = "#10b981";
  context.lineWidth = 2;
  context.setLineDash([6, 4]);
  context.strokeRect(pattern.x + 0.5, pattern.y + 0.5, pattern.width, pattern.height);
  context.fillStyle = "rgba(16, 185, 129, 0.12)";
  context.fillRect(pattern.x, pattern.y, pattern.width, pattern.height);
  context.fillStyle = "#10b981";
  context.font = "bold 10px monospace";
  context.fillText(`PATTERN (+${pattern.marginPx}px)`, pattern.x + 4, Math.max(14, pattern.y - 4));
  context.restore();
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
