/**
 * Smart-align geometry for ROI placement.
 *
 * Pure module: given a moving rect, its sibling rects, and an optional
 * image-bounds frame, returns the nudged rect that snaps its moving
 * edges to the nearest sibling / image edge or centre, plus the guide
 * lines to render. Kept dependency-free so the SelectionOverlay resize
 * path and unit tests can share the same math.
 */

export interface AlignRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export enum GuideKindType {
  Edge = "edge",
  Center = "center",
  Bounds = "bounds",
}
export type GuideKind = GuideKindType;

export interface AlignGuide {
  orientation: "v" | "h";
  /** Image-space coordinate of the line (x for v, y for h). */
  pos: number;
  /** Extent along the perpendicular axis, image space. */
  from: number;
  to: number;
  kind: GuideKind;
}

export interface AlignOptions {
  /** Half-width of the snap band, image pixels. */
  tolerance: number;
  imageBounds?: AlignRect;
  /**
   * Which handle the user is dragging. Determines which edges of the
   * moving rect are eligible to snap. Pass `"move"` for a whole-rect
   * translation (left/right/centreX all eligible in X; top/bottom/centreY
   * in Y).
   */
  handle: string;
}

export interface AlignResult {
  rect: AlignRect;
  guides: AlignGuide[];
  /**
   * Debug telemetry for the chosen snap on each axis, image-space. Only
   * populated for axes where a sibling / bounds line was actually within
   * tolerance. Consumers (SnapDebugHud) render the distance readout and
   * highlight which edge was selected. Enabled always: cost is one
   * struct allocation per drag frame, worth it for the always-on tests.
   */
  debug?: {
    x?: { edge: "l" | "r" | "cx"; target: number; dist: number; from: number };
    y?: { edge: "t" | "b" | "cy"; target: number; dist: number; from: number };
  };
}

interface LineEntry {
  from: number;
  to: number;
  kind: GuideKind;
}

function pushLine(map: Map<number, LineEntry[]>, key: number, entry: LineEntry) {
  const list = map.get(key);

  if (list) list.push(entry);
  else map.set(key, [entry]);
}

function collectLines(others: readonly AlignRect[], imageBounds: AlignRect | undefined) {
  const verticals = new Map<number, LineEntry[]>();
  const horizontals = new Map<number, LineEntry[]>();
  for (const o of others) {
    const top = o.y;
    const bottom = o.y + o.height;
    const left = o.x;
    const right = o.x + o.width;
    pushLine(verticals, left, { from: top, to: bottom, kind: GuideKindType.Edge });
    pushLine(verticals, right, { from: top, to: bottom, kind: GuideKindType.Edge });
    pushLine(verticals, left + o.width / 2, { from: top, to: bottom, kind: GuideKindType.Center });
    pushLine(horizontals, top, { from: left, to: right, kind: GuideKindType.Edge });
    pushLine(horizontals, bottom, { from: left, to: right, kind: GuideKindType.Edge });
    pushLine(horizontals, top + o.height / 2, {
      from: left,
      to: right,
      kind: GuideKindType.Center,
    });
  }

  if (imageBounds) {
    const t = imageBounds.y;
    const b = imageBounds.y + imageBounds.height;
    const l = imageBounds.x;
    const r = imageBounds.x + imageBounds.width;
    pushLine(verticals, l, { from: t, to: b, kind: GuideKindType.Bounds });
    pushLine(verticals, r, { from: t, to: b, kind: GuideKindType.Bounds });
    pushLine(verticals, l + imageBounds.width / 2, { from: t, to: b, kind: GuideKindType.Bounds });
    pushLine(horizontals, t, { from: l, to: r, kind: GuideKindType.Bounds });
    pushLine(horizontals, b, { from: l, to: r, kind: GuideKindType.Bounds });
    pushLine(horizontals, t + imageBounds.height / 2, {
      from: l,
      to: r,
      kind: GuideKindType.Bounds,
    });
  }

  return { verticals, horizontals };
}

function nearest(value: number, keys: readonly number[], tolerance: number) {
  let bestDist = Infinity;
  let bestKey = value;
  for (const k of keys) {
    const d = Math.abs(k - value);

    if (d <= tolerance && d < bestDist) {
      bestDist = d;
      bestKey = k;
    }
  }

  return { dist: bestDist, key: bestKey };
}

export enum XEdgeType {
  L = "l",
  R = "r",
  Cx = "cx",
}
export type XEdge = XEdgeType;
export enum YEdgeType {
  T = "t",
  B = "b",
  Cy = "cy",
}
export type YEdge = YEdgeType;

function xEligible(handle: string): XEdge[] {
  if (handle === "move") return [XEdgeType.L, XEdgeType.R, XEdgeType.Cx];
  const out: XEdge[] = [];

  if (handle.includes("w")) out.push(XEdgeType.L);

  if (handle.includes("e")) out.push(XEdgeType.R);

  return out;
}

function yEligible(handle: string): YEdge[] {
  if (handle === "move") return [YEdgeType.T, YEdgeType.B, YEdgeType.Cy];
  const out: YEdge[] = [];

  if (handle.includes("n")) out.push(YEdgeType.T);

  if (handle.includes("s")) out.push(YEdgeType.B);

  return out;
}

/**
 * Snap the moving rect's active edges to sibling / image lines within
 * `tolerance` image pixels. For handle drags the opposite edge is held
 * fixed (so width/height change); for `handle: "move"` the whole rect
 * translates by the winning delta.
 */
export function computeAlignment(
  rect: AlignRect,
  others: readonly AlignRect[],
  options: AlignOptions,
): AlignResult {
  const { tolerance, imageBounds, handle } = options;

  if (!(tolerance > 0)) return { rect, guides: [] };
  const { verticals, horizontals } = collectLines(others, imageBounds);
  const vKeys = Array.from(verticals.keys());
  const hKeys = Array.from(horizontals.keys());

  let { x, y, width, height } = rect;
  const guides: AlignGuide[] = [];
  const isMove = handle === "move";
  const debug: NonNullable<AlignResult["debug"]> = {};

  // X axis
  const xEdges = xEligible(handle);

  if (xEdges.length && vKeys.length) {
    let best = { dist: Infinity, edge: "l" as XEdge, target: 0 };
    let bestFrom = 0;
    for (const e of xEdges) {
      const val = e === "l" ? x : e === "r" ? x + width : x + width / 2;
      const n = nearest(val, vKeys, tolerance);

      if (n.dist < best.dist) {
        best = { dist: n.dist, edge: e, target: n.key };
        bestFrom = val;
      }
    }

    if (best.dist !== Infinity) {
      debug.x = { edge: best.edge, target: best.target, dist: best.dist, from: bestFrom };

      if (isMove) {
        const currentVal = best.edge === "l" ? x : best.edge === "r" ? x + width : x + width / 2;
        x += best.target - currentVal;
      } else if (best.edge === "l") {
        const nx = best.target;
        width = width + (x - nx);
        x = nx;
      } else if (best.edge === "r") {
        width = best.target - x;
      }

      for (const line of verticals.get(best.target) ?? []) {
        guides.push({ orientation: "v", pos: best.target, ...line });
      }

      guides.push({
        orientation: "v",
        pos: best.target,
        from: y,
        to: y + height,
        kind: GuideKindType.Edge,
      });
    }
  }

  // Y axis
  const yEdges = yEligible(handle);

  if (yEdges.length && hKeys.length) {
    let best = { dist: Infinity, edge: "t" as YEdge, target: 0 };
    let bestFrom = 0;
    for (const e of yEdges) {
      const val = e === "t" ? y : e === "b" ? y + height : y + height / 2;
      const n = nearest(val, hKeys, tolerance);

      if (n.dist < best.dist) {
        best = { dist: n.dist, edge: e, target: n.key };
        bestFrom = val;
      }
    }

    if (best.dist !== Infinity) {
      debug.y = { edge: best.edge, target: best.target, dist: best.dist, from: bestFrom };

      if (isMove) {
        const currentVal = best.edge === "t" ? y : best.edge === "b" ? y + height : y + height / 2;
        y += best.target - currentVal;
      } else if (best.edge === "t") {
        const ny = best.target;
        height = height + (y - ny);
        y = ny;
      } else if (best.edge === "b") {
        height = best.target - y;
      }

      for (const line of horizontals.get(best.target) ?? []) {
        guides.push({ orientation: "h", pos: best.target, ...line });
      }

      guides.push({
        orientation: "h",
        pos: best.target,
        from: x,
        to: x + width,
        kind: GuideKindType.Edge,
      });
    }
  }

  const result: AlignResult = { rect: { x, y, width, height }, guides };

  if (debug.x || debug.y) result.debug = debug;

  return result;
}

/**
 * Merge guides that fall on the same line into a single spanning segment
 * so the overlay renders one continuous line covering every aligned rect.
 */
export function mergeGuides(guides: readonly AlignGuide[]): AlignGuide[] {
  const byKey = new Map<string, AlignGuide>();
  for (const g of guides) {
    const key = `${g.orientation}:${g.pos}`;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, { ...g });
      continue;
    }

    existing.from = Math.min(existing.from, g.from);
    existing.to = Math.max(existing.to, g.to);
    // Precedence: bounds < edge < center for visual weight.
    const rank = (k: GuideKind) => (k === "center" ? 2 : k === "edge" ? 1 : 0);

    if (rank(g.kind) > rank(existing.kind)) existing.kind = g.kind;
  }

  return Array.from(byKey.values());
}

/**
 * Group-move variant: computes a corrective delta so that when the whole
 * selection translates by `delta`, at least one moving edge (per rect
 * OR the group bounding-box left/right/centre) snaps onto a sibling /
 * image line within `tolerance`. The chosen axis-correction is applied
 * uniformly to every rect so relative spacing inside the group is
 * preserved, which is the behaviour Figma / Sketch use for multi-select
 * drag.
 *
 * Returns the adjusted delta plus guides spanning all moving rects on
 * the winning line. `debug.from` reports the pre-correction position of
 * the winning edge (group-bbox centre for a bbox win, or the individual
 * rect edge otherwise) in image space.
 */
export function computeGroupMoveAlignment(
  rects: readonly AlignRect[],
  delta: { dx: number; dy: number },
  others: readonly AlignRect[],
  options: Omit<AlignOptions, "handle">,
): { delta: { dx: number; dy: number }; guides: AlignGuide[]; debug?: AlignResult["debug"] } {
  const { tolerance, imageBounds } = options;

  if (rects.length === 0 || !(tolerance > 0)) {
    return { delta, guides: [] };
  }

  const { verticals, horizontals } = collectLines(others, imageBounds);
  const vKeys = Array.from(verticals.keys());
  const hKeys = Array.from(horizontals.keys());

  // Translated rects + group bounding box.
  const moved = rects.map((r) => ({
    x: r.x + delta.dx,
    y: r.y + delta.dy,
    width: r.width,
    height: r.height,
  }));
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const r of moved) {
    if (r.x < minX) minX = r.x;

    if (r.y < minY) minY = r.y;

    if (r.x + r.width > maxX) maxX = r.x + r.width;

    if (r.y + r.height > maxY) maxY = r.y + r.height;
  }

  const bbox: AlignRect = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };

  // Candidate edge values on each axis (post-translation).
  interface XCand {
    value: number;
    edge: "l" | "r" | "cx";
  }

  interface YCand {
    value: number;
    edge: "t" | "b" | "cy";
  }

  const xCands: XCand[] = [];
  const yCands: YCand[] = [];
  for (const r of moved) {
    xCands.push({ value: r.x, edge: "l" });
    xCands.push({ value: r.x + r.width, edge: "r" });
    xCands.push({ value: r.x + r.width / 2, edge: "cx" });
    yCands.push({ value: r.y, edge: "t" });
    yCands.push({ value: r.y + r.height, edge: "b" });
    yCands.push({ value: r.y + r.height / 2, edge: "cy" });
  }
  // Group bbox candidates (only meaningful when >1 rect but harmless otherwise).
  xCands.push({ value: bbox.x, edge: "l" });
  xCands.push({ value: bbox.x + bbox.width, edge: "r" });
  xCands.push({ value: bbox.x + bbox.width / 2, edge: "cx" });
  yCands.push({ value: bbox.y, edge: "t" });
  yCands.push({ value: bbox.y + bbox.height, edge: "b" });
  yCands.push({ value: bbox.y + bbox.height / 2, edge: "cy" });

  let bestX = { dist: Infinity, correction: 0, target: 0, edge: "l" as XCand["edge"], from: 0 };
  for (const c of xCands) {
    const n = nearest(c.value, vKeys, tolerance);

    if (n.dist < bestX.dist) {
      bestX = {
        dist: n.dist,
        correction: n.key - c.value,
        target: n.key,
        edge: c.edge,
        from: c.value,
      };
    }
  }

  let bestY = { dist: Infinity, correction: 0, target: 0, edge: "t" as YCand["edge"], from: 0 };
  for (const c of yCands) {
    const n = nearest(c.value, hKeys, tolerance);

    if (n.dist < bestY.dist) {
      bestY = {
        dist: n.dist,
        correction: n.key - c.value,
        target: n.key,
        edge: c.edge,
        from: c.value,
      };
    }
  }

  const dx = delta.dx + (bestX.dist !== Infinity ? bestX.correction : 0);
  const dy = delta.dy + (bestY.dist !== Infinity ? bestY.correction : 0);

  const guides: AlignGuide[] = [];
  // Post-correction bounds along the perpendicular axis so guides span
  // the whole group.
  const spanY = { from: minY + (dy - delta.dy), to: maxY + (dy - delta.dy) };
  const spanX = { from: minX + (dx - delta.dx), to: maxX + (dx - delta.dx) };

  if (bestX.dist !== Infinity) {
    for (const line of verticals.get(bestX.target) ?? []) {
      guides.push({ orientation: "v", pos: bestX.target, ...line });
    }

    guides.push({
      orientation: "v",
      pos: bestX.target,
      from: spanY.from,
      to: spanY.to,
      kind: GuideKindType.Edge,
    });
  }

  if (bestY.dist !== Infinity) {
    for (const line of horizontals.get(bestY.target) ?? []) {
      guides.push({ orientation: "h", pos: bestY.target, ...line });
    }

    guides.push({
      orientation: "h",
      pos: bestY.target,
      from: spanX.from,
      to: spanX.to,
      kind: GuideKindType.Edge,
    });
  }

  const debug: NonNullable<AlignResult["debug"]> = {};

  if (bestX.dist !== Infinity) {
    debug.x = { edge: bestX.edge, target: bestX.target, dist: bestX.dist, from: bestX.from };
  }

  if (bestY.dist !== Infinity) {
    debug.y = { edge: bestY.edge, target: bestY.target, dist: bestY.dist, from: bestY.from };
  }

  const result: {
    delta: { dx: number; dy: number };
    guides: AlignGuide[];
    debug?: AlignResult["debug"];
  } = {
    delta: { dx, dy },
    guides,
  };

  if (debug.x || debug.y) result.debug = debug;

  return result;
}

/**
 * Group-resize alignment: given the moving group's current bounding
 * box, the proposed post-drag bbox, and which handle is being dragged,
 * returns a scaled bbox whose active edges snap onto sibling lines.
 * Callers apply the resulting scale/translation to every rect in the
 * selection (see SelectionOverlay's future multi-resize path).
 */
export function computeGroupResizeAlignment(
  originBbox: AlignRect,
  proposedBbox: AlignRect,
  others: readonly AlignRect[],
  options: AlignOptions,
): { bbox: AlignRect; guides: AlignGuide[]; debug?: AlignResult["debug"] } {
  const aligned = computeAlignment(proposedBbox, others, options);
  // Preserve the anchor edge (opposite the active handle) so the resize
  // pivots correctly; computeAlignment already does this for handle
  // drags, so we can pass its result through.
  void originBbox;

  return { bbox: aligned.rect, guides: aligned.guides, debug: aligned.debug };
}
