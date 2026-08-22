/**
 * Plan 65 step 7 (SS-02): FloatingWindow.
 *
 * Renders a draggable window in a portal. Uses dnd-kit's `useDraggable`
 * so the same drag context that owns docking can also move floating
 * panels. Position comes from the layout store; while dragging the
 * transform is applied inline and committed via `onCommit` on drag end.
 *
 * Resizing is intentionally kept minimal (native `resize: both` on the
 * body wrapper) so we do not pull in another library. `PanelHost` handles
 * the transform-to-rect commit via `DndContext.onDragEnd`.
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { DockSlotType } from "@/lib/enums/ui";
import { cn } from "@/lib/utils";
import { useUiPrefsStore } from "@/lib/stores/ui-prefs-store";
import { useWorkspaceLayoutStore, type FloatingRect } from "@/lib/workspace/layout-slice";

export interface FloatingWindowProps {
  panelId: string;
  rect: FloatingRect;
  className?: string;
  onDragChange?: (isDragging: boolean) => void;
  children: (dragHandleProps: React.HTMLAttributes<HTMLDivElement>) => React.ReactNode;
}

/**
 * Plan 67 steps 5-6: momentum + edge snap tuning.
 *
 * MOMENTUM_MS: cap on how long the release inertia can play. Exponential
 * decay (DECAY_PER_FRAME) makes the motion feel like a light flick, not a
 * bowling ball. VELOCITY_WINDOW_MS bounds the sample window so a slow
 * drag ended with a sudden jerk uses that jerk (not the average over the
 * whole drag). EDGE_SNAP_PX is the "close enough, latch to the edge"
 * threshold applied after momentum resolves.
 */
const VELOCITY_WINDOW_MS = 80;
const MOMENTUM_MS = 220;
const DECAY_PER_FRAME = 0.86;
const MIN_VELOCITY = 0.05; // px/ms
const EDGE_SNAP_PX = 24;

type Sample = { t: number; x: number; y: number };

function computeVelocity(samples: Sample[], now: number): { vx: number; vy: number } {
  const recent = samples.filter((s) => now - s.t <= VELOCITY_WINDOW_MS);

  if (recent.length < 2) return { vx: 0, vy: 0 };
  const first = recent[0];
  const last = recent[recent.length - 1];
  const dt = Math.max(1, last.t - first.t);

  return { vx: (last.x - first.x) / dt, vy: (last.y - first.y) / dt };
}

function snapToEdge(rect: FloatingRect): FloatingRect {
  if (typeof window === "undefined") return rect;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let x = rect.x;
  let y = rect.y;

  if (x < EDGE_SNAP_PX) x = 0;
  else if (x + rect.width > vw - EDGE_SNAP_PX) x = Math.max(0, vw - rect.width);

  if (y < EDGE_SNAP_PX) y = 0;
  else if (y + rect.height > vh - EDGE_SNAP_PX) y = Math.max(0, vh - rect.height);

  return { ...rect, x, y };
}

export function FloatingWindow({
  panelId,
  rect,
  className,
  onDragChange,
  children,
}: FloatingWindowProps): React.JSX.Element | null {
  const nodeRef = React.useRef<HTMLDivElement | null>(null);
  const startRef = React.useRef<{ x: number; y: number; rect: FloatingRect } | null>(null);
  const hasMovedRef = React.useRef(false);
  const samplesRef = React.useRef<Sample[]>([]);
  const rafRef = React.useRef<number | null>(null);
  const [delta, setDelta] = React.useState<{ x: number; y: number } | null>(null);
  const [settling, setSettling] = React.useState(false);
  React.useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );
  // Enforce a minimum floating window width so the titlebar (collapse +
  // title + minimize + close) always fits without truncating to "T…".
  // 220px is the smallest width where the default control set + a short
  // title renders cleanly at both Compact and Comfortable density.
  const MIN_FLOAT_WIDTH = 220;
  const MIN_FLOAT_HEIGHT = 120;
  const style: React.CSSProperties = {
    left: rect.x,
    top: rect.y,
    width: Math.max(rect.width, MIN_FLOAT_WIDTH),
    height: Math.max(rect.height, MIN_FLOAT_HEIGHT),
    minWidth: MIN_FLOAT_WIDTH,
    minHeight: MIN_FLOAT_HEIGHT,
    transform: delta ? `translate3d(${delta.x}px, ${delta.y}px, 0)` : undefined,
    transition: settling ? "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)" : undefined,
  };

  const beginDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const isControl = (e.target as Element).closest("button");
    const isHandle = (e.target as Element).closest("[data-panel-drag-handle]");

    if (isControl) {
      return;
    }

    if (isHandle === null) {
      return;
    }

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    startRef.current = { x: e.clientX, y: e.clientY, rect };
    hasMovedRef.current = false;
    samplesRef.current = [{ t: performance.now(), x: e.clientX, y: e.clientY }];
    setSettling(false);
    onDragChange?.(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moveDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = startRef.current;
    if (!s) {
      return;
    }
    const next = { x: e.clientX - s.x, y: e.clientY - s.y };

    if (Math.hypot(next.x, next.y) >= 8) hasMovedRef.current = true;
    const now = performance.now();
    samplesRef.current.push({ t: now, x: e.clientX, y: e.clientY });
    // Keep the sample buffer bounded.
    while (samplesRef.current.length > 12) samplesRef.current.shift();
    setDelta(next);
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (hasMovedRef.current === false) {
      startRef.current = null;
      samplesRef.current = [];
      onDragChange?.(false);

      return;
    }

    const s = startRef.current;
    startRef.current = null;
    if (!s) {
      onDragChange?.(false);
      hasMovedRef.current = false;

      return;
    }
    // If the user released over a dock slot, dock immediately (no momentum).
    const dockEl = document
      .elementsFromPoint(e.clientX, e.clientY)
      .map((el) => el.closest("[data-dock-slot]"))
      .find((n): n is Element => !!n && n.classList.contains("hidden") === false);
    const dock = dockEl?.getAttribute("data-dock-slot") as DockSlotType | null;

    if (dock) {
      samplesRef.current = [];
      setDelta(null);
      onDragChange?.(false);
      hasMovedRef.current = false;
      useWorkspaceLayoutStore.getState().dockPanel(panelId, dock);

      return;
    }
    // Otherwise: run momentum, then edge-snap, then commit.
    const { vx, vy } = computeVelocity(samplesRef.current, performance.now());
    samplesRef.current = [];
    hasMovedRef.current = false;
    const baseDelta = { x: e.clientX - s.x, y: e.clientY - s.y };
    runMomentumAndCommit({
      panelId,
      startRect: s.rect,
      baseDelta,
      velocity: { vx, vy },
      onFrame: setDelta,
      onSettling: setSettling,
      onDragChange,
      rafRef,
    });
  };
  const handleProps: React.HTMLAttributes<HTMLDivElement> = {};

  if (typeof document === "undefined") return null;
  const density = useUiPrefsStore((s) => s.headerDensity);

  return createPortal(
    <div
      ref={nodeRef}
      style={style}
      onPointerDown={beginDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      data-panel-id={panelId}
      data-density={density}
      data-dragging={delta ? "true" : "false"}
      className={cn("panel-floating-window flex min-h-0 flex-col", className)}
    >
      {children(handleProps)}
    </div>,
    document.body,
  );
}

/**
 * Plan 67 step 6: after release, drive the delta with decayed velocity for
 * up to MOMENTUM_MS. Plan 67 step 5: once inertia resolves, apply edge
 * snap before writing the final rect. Both effects run purely on the
 * transient `delta` so the store commits exactly once at the end.
 */
function runMomentumAndCommit(args: {
  panelId: string;
  startRect: FloatingRect;
  baseDelta: { x: number; y: number };
  velocity: { vx: number; vy: number };
  onFrame: (d: { x: number; y: number } | null) => void;
  onSettling: (v: boolean) => void;
  onDragChange?: (isDragging: boolean) => void;
  rafRef: React.MutableRefObject<number | null>;
}) {
  const { panelId, startRect, baseDelta, velocity, onFrame, onSettling, onDragChange, rafRef } =
    args;
  const speed = Math.hypot(velocity.vx, velocity.vy);
  const commit = (finalDelta: { x: number; y: number }) => {
    const raw: FloatingRect = {
      ...startRect,
      x: startRect.x + finalDelta.x,
      y: startRect.y + finalDelta.y,
    };
    const snapped = snapToEdge(raw);
    const snapDelta = { x: snapped.x - startRect.x, y: snapped.y - startRect.y };
    // If snap moved the window, ease into the snapped position.
    const needsSnapEase =
      Math.abs(snapDelta.x - finalDelta.x) > 0.5 || Math.abs(snapDelta.y - finalDelta.y) > 0.5;
    const write = () => {
      onFrame(null);
      onSettling(false);
      onDragChange?.(false);
      useWorkspaceLayoutStore.getState().floatPanel(panelId, snapped);
    };

    if (needsSnapEase) {
      onSettling(true);
      onFrame(snapDelta);
      window.setTimeout(write, 190);
    } else {
      write();
    }
  };

  if (speed < MIN_VELOCITY) {
    commit(baseDelta);

    return;
  }

  const startTime = performance.now();
  let vx = velocity.vx;
  let vy = velocity.vy;
  let dx = baseDelta.x;
  let dy = baseDelta.y;
  let lastT = startTime;
  const step = (t: number) => {
    const elapsed = t - startTime;
    const frame = Math.max(1, t - lastT);
    lastT = t;
    // Advance by velocity, then decay velocity per ~16ms frame.
    dx += vx * frame;
    dy += vy * frame;
    const decay = Math.pow(DECAY_PER_FRAME, frame / 16);
    vx *= decay;
    vy *= decay;
    onFrame({ x: dx, y: dy });

    if (elapsed >= MOMENTUM_MS || Math.hypot(vx, vy) < MIN_VELOCITY) {
      rafRef.current = null;
      commit({ x: dx, y: dy });

      return;
    }

    rafRef.current = requestAnimationFrame(step);
  };
  rafRef.current = requestAnimationFrame(step);
}
