import type { EditorPoint, EditorRect, EditorRule } from "./types";

const HIT_PADDING_PX = 3;

export function hitTest(image: EditorPoint, rules: readonly EditorRule[]): string | null {
  for (let index = rules.length - 1; index >= 0; index -= 1) {
    const rule = rules[index];

    if (!rule || canHit(rule) === false) continue;
    // Rotation-aware hit test: unrotate the pointer around the ROI centre
    // by -θ, then compare against the padded axis-aligned rect. Without
    // this, dragging a rotated ROI's visible body silently misses the
    // AABB (the AABB is the *unrotated* rect, not the rotated bounds),
    // so the operator "can't shift" the shape.
    const local = unrotateAroundCenter(image, rule);

    if (pointInRect(local, inflate(rule, HIT_PADDING_PX))) return rule.id;
  }

  return null;
}

export function pointInRect(point: EditorPoint, rect: EditorRect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

// Hidden rules are invisible and thus unhittable. Locked rules stay hittable
// so users can still select them from the canvas (Photoshop semantics); the
// move/resize guard in CanvasViewport + SelectionOverlay blocks transforms.
function canHit(rule: EditorRule): boolean {
  
  return !rule.isHidden && rule.width > 0 && rule.height > 0;
}

function inflate(rect: EditorRect, amount: number): EditorRect {
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
  };
}

function unrotateAroundCenter(point: EditorPoint, rule: EditorRule): EditorPoint {
  const theta =
    typeof rule.rotation === "number" && Number.isFinite(rule.rotation) ? rule.rotation : 0;

  if (theta === 0) return point;
  const cx = rule.x + rule.width / 2;
  const cy = rule.y + rule.height / 2;
  const rad = (-theta * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - cx;
  const dy = point.y - cy;

  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}
