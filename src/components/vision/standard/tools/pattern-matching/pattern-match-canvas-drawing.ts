import { regionHandles } from "@/components/vision/white-box/pattern-geometry";
import type { BoxMatchItem, PatternMatchResult } from "@/lib/vision/pattern-matcher";
import type { SearchRegion } from "@/lib/vision/white-box-marking";

export function drawMatchSearchRegion(
  ctx: CanvasRenderingContext2D,
  region: SearchRegion,
): void {
  ctx.save();
  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 5]);
  ctx.strokeRect(region.x + 0.5, region.y + 0.5, region.width, region.height);
  ctx.setLineDash([]);
  ctx.fillStyle = "#22d3ee";
  ctx.strokeStyle = "#001015";

  for (const handle of regionHandles(region)) {
    ctx.fillRect(handle.x - 4, handle.y - 4, 8, 8);
    ctx.strokeRect(handle.x - 4.5, handle.y - 4.5, 9, 9);
  }

  ctx.fillStyle = "#22d3ee";
  ctx.font = "bold 10px monospace";
  ctx.fillText("SEARCH REGION", region.x + 4, Math.max(12, region.y - 6));
  ctx.restore();
}

export function drawMatchEnvelope(
  ctx: CanvasRenderingContext2D,
  match: PatternMatchResult,
): void {
  const bounds = match.patternBounds;
  const strokeColor = match.isPass ? "#10b981" : "#ef4444";
  const fillColor = match.isPass ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)";

  ctx.save();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 2]);
  ctx.strokeRect(bounds.x + 0.5, bounds.y + 0.5, bounds.width, bounds.height);
  ctx.fillStyle = fillColor;
  ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

  const label = `${match.isPass ? "PASS" : "FAIL"}: ${match.score}% (${match.matchedCount}/${match.totalCount})`;
  const labelWidth = label.length * 7 + 10;
  const labelY = bounds.y >= 16 ? bounds.y - 15 : bounds.y + bounds.height + 4;

  ctx.fillStyle = strokeColor;
  ctx.fillRect(bounds.x, labelY, labelWidth, 14);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 9px monospace";
  ctx.fillText(label, bounds.x + 4, labelY + 10);
  ctx.restore();
}

export function drawMatchedBoxItems(
  ctx: CanvasRenderingContext2D,
  boxResults: readonly BoxMatchItem[],
): void {
  ctx.save();

  for (const box of boxResults) {
    const isMatched = box.isMatched;
    const strokeColor = isMatched ? "#10b981" : "#ef4444";
    const x = box.matchedX;
    const y = box.matchedY;

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = isMatched ? 1.5 : 2;
    ctx.setLineDash(isMatched ? [] : [3, 3]);
    ctx.strokeRect(x + 0.5, y + 0.5, box.width, box.height);

    const text = isMatched ? `#${box.boxNumber}` : `!#${box.boxNumber}`;
    const badgeW = text.length * 6 + 6;
    const badgeY = y >= 12 ? y - 11 : y + 2;

    ctx.fillStyle = strokeColor;
    ctx.fillRect(x, badgeY, badgeW, 10);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 8px monospace";
    ctx.fillText(text, x + 2, badgeY + 8);
  }

  ctx.restore();
}
