/**
 * Plan 79 step 38 foundation: marquee multiselect geometry.
 *
 * The canvas gesture layer (CanvasViewport) will call
 * {@link marqueeFromPoints} while the user drags on empty space with the
 * marquee modifier (Shift), then {@link ruleIdsInMarquee} on release to
 * feed `setSelection(ids, "canvas-marquee")` into the rules store.
 *
 * Kept in a standalone module so the geometry is unit-testable without
 * mounting the 1176-line viewport component.
 */

import type { EditorRule } from "@/lib/editor/types";

export interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Build a normalised (positive w/h) rect from two image-space points.
 * Points come from `startRuleGesture`'s coord conversion so they are
 * already in image coordinates; direction of the drag does not matter.
 */
export function marqueeFromPoints(
  a: { x: number; y: number },
  b: { x: number; y: number },
): MarqueeRect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const width = Math.abs(a.x - b.x);
  const height = Math.abs(a.y - b.y);

  return { x, y, width, height };
}

/**
 * A marquee counts as "engaged" only after it clears a small threshold,
 * otherwise a bare click on empty space would clear selection *and*
 * open a zero-area marquee.
 */
export function isMarqueeEngaged(rect: MarqueeRect, minPx = 4): boolean {
  return rect.width >= minPx || rect.height >= minPx;
}

/**
 * Standard AABB overlap test. `intersect` semantics (any overlap
 * selects) match Figma / Photoshop default; a future `contain` mode can
 * layer on top by tightening the predicate.
 */
export function rectsIntersect(a: MarqueeRect, b: MarqueeRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * Returns the rule IDs whose axis-aligned bounding box intersects the
 * marquee. Locked or hidden rules are excluded so a marquee cannot
 * silently pull them into a batch operation.
 */
export function ruleIdsInMarquee(rect: MarqueeRect, rules: readonly EditorRule[]): string[] {
  const out: string[] = [];
  for (const r of rules) {
    if (r.isHidden || r.isLocked) continue;

    if (rectsIntersect(rect, { x: r.x, y: r.y, width: r.width, height: r.height })) {
      out.push(r.id);
    }
  }

  return out;
}